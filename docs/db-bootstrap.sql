-- merxylab-store bootstrap SQL
--
-- Fresh-install script. Run against an empty MySQL 8 database to create
-- every table, then insert the reference data the app cannot boot without.
--
-- Includes the current product catalog (sections 4-5) so a fresh install boots
-- with a working shop. Divisions and payment methods must stay regardless:
-- checkout reads divisions for delivery fees and COD eligibility, and the
-- payment step reads payment_methods.
--
-- There is no `categories` table. The shop's five categories live in
-- `src/lib/categories.ts` and ship with the code, so `products.category_id`
-- carries no foreign key; the admin product routes validate it against that
-- list instead.
--
-- How to apply:
--   Local:     mysql -u root -p merxylab < docs/db-bootstrap.sql
--   Hostinger: hPanel -> MySQL Databases -> phpMyAdmin -> select the DB ->
--              Import -> upload this file -> Go.
--
-- Every section is hand-maintained: schema from src/db/schema/*.ts, the rest by
-- editing this file. A generator script used to rewrite sections 2-3 from a live
-- database; it was removed because its rewrite window ran to the end of the file
-- and silently deleted the catalog below.
--
-- Run order: schema -> divisions -> payment_methods.
--
-- Notes:
--   * site_settings ships empty; rows are inserted at runtime via /admin.
--   * Product photos, payment QR, and slips live on Cloudflare R2, no
--     filesystem writes. Uploading via /admin sets has_photos per product.
--   * After install, grant yourself admin:
--       UPDATE users SET role='admin' WHERE email='you@example.com';

-- =================================================================
-- 1. Schema
-- =================================================================
CREATE TABLE `addresses` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`label` varchar(40) NOT NULL,
	`recipient` varchar(120) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`division_id` varchar(40) NOT NULL,
	`city` varchar(120) NOT NULL,
	`township` varchar(120) NOT NULL,
	`street` varchar(200) NOT NULL,
	`landmark` varchar(200),
	`telegram_username` varchar(32),
	`maps_url` varchar(512),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);

CREATE TABLE `accounts` (
	`userId` varchar(36) NOT NULL,
	`type` varchar(40) NOT NULL,
	`provider` varchar(80) NOT NULL,
	`providerAccountId` varchar(200) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` varchar(40),
	`scope` varchar(500),
	`id_token` text,
	`session_state` varchar(500),
	CONSTRAINT `accounts_provider_providerAccountId_pk` PRIMARY KEY(`provider`,`providerAccountId`)
);

CREATE TABLE `sessions` (
	`session_token` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `sessions_session_token` PRIMARY KEY(`session_token`)
);

CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120),
	`email` varchar(254) NOT NULL,
	`email_verified` timestamp(3),
	`password_hash` varchar(60),
	-- NULL means the password has not moved since this column shipped, which
	-- tells src/lib/auth.ts to accept whatever session token the user holds.
	-- Set on every password change; a mismatch against the JWT evicts it.
	`password_changed_at` timestamp(3) NULL,
	`image` varchar(500),
	`role` enum('customer','admin') NOT NULL DEFAULT 'customer',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

CREATE TABLE `verification_tokens` (
	`identifier` varchar(254) NOT NULL,
	`token` varchar(255) NOT NULL,
	-- Email verification and password reset share this table. Without a
	-- purpose, a token minted for one is accepted by the other's route.
	`purpose` enum('verify','reset') NOT NULL DEFAULT 'verify',
	`expires` timestamp NOT NULL,
	CONSTRAINT `verification_tokens_identifier_token_pk` PRIMARY KEY(`identifier`,`token`)
);

CREATE TABLE `cart_items` (
	`cart_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`qty` int NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cart_items_cart_id_product_id_pk` PRIMARY KEY(`cart_id`,`product_id`)
);

CREATE TABLE `carts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`session_id` varchar(36),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `divisions` (
	`id` varchar(40) NOT NULL,
	`name` varchar(60) NOT NULL,
	`delivery_fee_mmk` bigint NOT NULL,
	`cod_allowed` boolean NOT NULL DEFAULT false,
	`is_blocked` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `divisions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `product_specs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`label` varchar(80) NOT NULL,
	`value` varchar(200) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_specs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `products` (
	`id` varchar(64) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category_id` varchar(32) NOT NULL,
	`price_mmk` bigint NOT NULL,
	`sale_price_mmk` bigint,
	`tagline` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`swatch` char(7) NOT NULL,
	`stock_qty` int NOT NULL DEFAULT 0,
	`low_stock_threshold` int NOT NULL DEFAULT 3,
	`has_photos` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `payment_methods` (
	`id` varchar(40) NOT NULL,
	`name` varchar(60) NOT NULL,
	`kind` enum('wallet','cod') NOT NULL,
	`account_name` varchar(120),
	`account_phone` varchar(20),
	`qr_image_url` varchar(255),
	`instructions_md` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);

CREATE TABLE `order_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`qty` int NOT NULL,
	`unit_price_mmk_snapshot` bigint NOT NULL,
	`list_price_mmk_snapshot` bigint,
	`name_snapshot` varchar(120) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`status` enum('pending_payment','payment_submitted','confirmed','delivered','cancelled') NOT NULL DEFAULT 'pending_payment',
	`subtotal_mmk` bigint NOT NULL,
	`delivery_fee_mmk` bigint NOT NULL,
	`total_mmk` bigint NOT NULL,
	`shipping_address_id` varchar(36),
	-- Delivery destination frozen at placement. Address rows stay editable, so
	-- reading these through the join let a later edit redirect a live order.
	`ship_recipient` varchar(120),
	`ship_phone` varchar(20),
	`ship_telegram` varchar(32),
	`ship_division_id` varchar(40),
	`ship_division_name` varchar(60),
	`ship_city` varchar(120),
	`ship_township` varchar(120),
	`ship_street` varchar(200),
	`ship_landmark` varchar(200),
	`ship_maps_url` varchar(512),
	`payment_method_id` varchar(40) NOT NULL,
	`payment_proof_url` varchar(255),
	`payment_tx_ref` varchar(120),
	`payment_ref` varchar(64),
	`expires_at` timestamp NOT NULL,
	`notes` text,
	`placed_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);

CREATE TABLE `reviews` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`rating` tinyint NOT NULL,
	`title` varchar(120),
	`body` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`verified_purchase` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_review_user_product` UNIQUE(`user_id`,`product_id`)
);

CREATE TABLE `wishlists` (
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_user_id_product_id_pk` PRIMARY KEY(`user_id`,`product_id`)
);

CREATE TABLE `site_settings` (
	`key` varchar(80) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);

ALTER TABLE `addresses` ADD CONSTRAINT `addresses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_division_id_divisions_id_fk` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `product_specs` ADD CONSTRAINT `product_specs_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `orders` ADD CONSTRAINT `orders_shipping_address_id_addresses_id_fk` FOREIGN KEY (`shipping_address_id`) REFERENCES `addresses`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `orders` ADD CONSTRAINT `orders_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
CREATE INDEX `idx_addresses_user` ON `addresses` (`user_id`);
CREATE INDEX `idx_accounts_user` ON `accounts` (`userId`);
CREATE INDEX `idx_carts_user` ON `carts` (`user_id`);
CREATE INDEX `idx_carts_session` ON `carts` (`session_id`);
CREATE INDEX `idx_specs_product` ON `product_specs` (`product_id`,`sort_order`);
CREATE INDEX `idx_products_category` ON `products` (`category_id`);
CREATE INDEX `idx_products_featured` ON `products` (`featured`);
CREATE INDEX `idx_products_is_active` ON `products` (`is_active`);
CREATE INDEX `idx_products_sort` ON `products` (`sort_order`);
CREATE INDEX `idx_orders_user` ON `orders` (`user_id`);
CREATE INDEX `idx_orders_status` ON `orders` (`status`);
CREATE INDEX `idx_orders_placed` ON `orders` (`placed_at`);
CREATE INDEX `idx_orders_expires` ON `orders` (`status`,`expires_at`);
CREATE INDEX `idx_reviews_product_status` ON `reviews` (`product_id`,`status`);

-- =================================================================
-- 2. Divisions (BeeExpress shipping rates)
-- =================================================================
INSERT INTO `divisions` (`id`, `name`, `delivery_fee_mmk`, `cod_allowed`, `is_blocked`, `sort_order`) VALUES
('mandalay', 'Mandalay Region', 3000, 1, 0, 1),
('yangon', 'Yangon Region', 5000, 1, 0, 2),
('naypyidaw', 'Naypyidaw Union Territory', 5000, 0, 0, 3),
('bago', 'Bago Region', 5750, 0, 0, 4),
('magway', 'Magway Region', 5750, 0, 0, 5),
('ayeyarwady', 'Ayeyarwady Region', 6250, 0, 0, 6),
('chin', 'Chin State', 6250, 0, 0, 7),
('mon', 'Mon State', 6250, 0, 0, 8),
('shan', 'Shan State', 6500, 0, 0, 9),
('rakhine', 'Rakhine State', 7000, 0, 0, 10),
('kachin', 'Kachin State', 8500, 0, 0, 11),
('tanintharyi', 'Tanintharyi Region', 8500, 0, 0, 12),
('kayah', 'Kayah State', 0, 0, 1, 13),
('kayin', 'Kayin State', 0, 0, 1, 14),
('sagaing', 'Sagaing Region', 0, 0, 1, 15);


-- =================================================================
-- 3. Payment methods
-- =================================================================
INSERT INTO `payment_methods` (`id`, `name`, `kind`, `account_name`, `account_phone`, `qr_image_url`, `instructions_md`, `sort_order`, `is_active`) VALUES
('kbz_pay', 'KBZ Pay', 'wallet', NULL, NULL, NULL, NULL, 1, 0),
('aya_pay', 'Aya Pay', 'wallet', NULL, NULL, NULL, NULL, 2, 0),
('uab_pay', 'UAB Pay', 'wallet', NULL, NULL, NULL, NULL, 3, 0),
('kbz_bank', 'KBZ Bank', 'wallet', NULL, NULL, NULL, NULL, 4, 0),
('cod', 'Cash on Delivery', 'cod', NULL, NULL, NULL, NULL, 5, 1);


-- =================================================================
-- 4. Products
-- =================================================================
INSERT INTO `products` (`id`, `slug`, `name`, `category_id`, `price_mmk`, `tagline`, `description`, `swatch`, `stock_qty`, `low_stock_threshold`, `has_photos`, `is_active`, `featured`, `sort_order`) VALUES
('7hz-x-crinacle-zero-2-in-ear-monitor', '7hz-x-crinacle-zero-2-in-ear-monitor', '7Hz x Crinacle Zero:2 In-Ear Monitor', 'audio', 120000, '10mm dynamic driver IEM with deeper bass and clean tone', 'Wired in-ear monitor from 7Hz, tuned together with Crinacle. Metal shell, 10mm dual-cavity dynamic driver, and a detachable 0.78mm 2-pin cable. Good for music listening and gaming.

Key points
+ New 10mm dynamic driver with PU and metal composite diaphragm, faster response and cleaner notes
+ Bass lifted 3dB over the original Zero, more punch and deeper extension
+ Slightly warmer lower mids, fuller vocals and instruments, still clean
+ Wide 10Hz to 20kHz frequency range
+ 32 ohm impedance, easy to drive from a phone or laptop
+ Detachable 0.78mm 2-pin cable, OFC wire
+ Works with phone, PC, laptop and other 3.5mm sources

Note
No microphone. No inline volume or button controls.', '#7A4F36', 3, 3, 1, 1, 1, 4),
('arzopa-z1fc-portable-monitor', 'arzopa-z1fc-portable-monitor', 'ARZOPA Z1FC Portable Monitor', 'monitors', 600000, '16.1" FHD 144Hz portable screen for gaming, work and movies', 'Portable 16.1" FHD (1920x1080) monitor with 144Hz refresh rate and 106% sRGB colour. Sharp, smooth picture for gaming, work and watching movies.

Key points
+ 16.1" FHD panel, 106% sRGB, bright and accurate colour
+ 144Hz refresh rate, smooth motion for gamers
+ HDR support, deeper blacks and clearer detail
+ Works with laptop, PC, Mac, Nintendo Switch, PlayStation, Xbox, Steam Deck
+ Thin and light, easy to carry
+ Plug and play over USB-C or Mini HDMI
+ 2 year warranty

In the box
1x ARZOPA 16.1" portable monitor
2x USB-C cable
1x Mini HDMI cable
1x User manual
(Grey version only) 1x Carry case

Colour options
Black: monitor + 2 year warranty
Grey: monitor + 2 year warranty + free carry case', '#7A4F36', 2, 3, 1, 1, 1, 7),
('elite-monitor-arm', 'elite-monitor-arm', 'Elite Monitor Arm', 'accessories', 80000, 'Float your screen anywhere. 360 degree gas spring arm.', 'A single-monitor arm that clamps to your desk and lifts the screen off it 
completely. The gas spring holds any position you set, so you can pull the 
screen closer, push it back, or swing it aside with one hand.

Fits 17 to 27 inch monitors up to 9 kg. Tilts down 50 degrees and up 35 
degrees, rotates a full 360, and flips between landscape and portrait. 
Built-in cable channel keeps the wires out of sight.

Aluminium alloy build. Mounts by desk clamp or grommet hole, manual in the 
box. Works with any brand of monitor with standard VESA holes.', '#7A4F36', 10, 2, 1, 1, 0, 6),
('keychron-k2-pro', 'keychron-k2-pro', 'Keychron K2 Pro', 'keyboards', 545000, '75% hot-swap with tri-mode wireless.', 'Keychron''s flagship 75% in tri-mode. Hot-swap PCB, gasket structure, and QMK/VIA support. Bluetooth, 2.4G, USB-C wired.', '#3D342A', 3, 1, 1, 1, 1, 2),
('logitech-g-pro-x-superlight-2', 'logitech-g-pro-x-superlight-2', 'Logitech G PRO X Superlight 2', 'mice', 650000, 'Sub-60g flagship. The pro pick.', 'HERO 2 sensor, LIGHTSPEED wireless, and a sub-60-gram shell. The benchmark for high-performance wireless mice.', '#897e70', 4, 2, 1, 1, 0, 19),
('logitech-mx-master-4', 'logitech-mx-master-4', 'Logitech Mx Master 4', 'mice', 568000, 'mouse', 'Meet the MX Master 4 that brings immersive control and precision you can feel with customizable haptic feedback on specific actions. Save up to 33% of your time with Actions Ring shortcuts and MX Master 4, by accessing tools and filters at your cursor. Additional features: 2x better connectivity, ultra fast scrolling with the MagSpeed scroll wheel, 8k DPI any surface tracking, including glass & Logi Options+ for customization.', '#b0a39b', 1, 3, 1, 1, 1, 5),
('premium-deskmat', 'premium-deskmat', 'Nubwo Premium DeskMat', 'accessories', 60000, '900x400, 4mm cloth, washable, mouse pad', 'A 900x400 mm cloth deskmat with non-slip backing and stitched edges. Washable, four millimetres thick.', '#4A3E33', 9, 2, 1, 1, 0, 3),
('vxe-dragonfly-r1-se', 'vxe-dragonfly-r1-se', 'VXE Dragonfly R1 SE+', 'mice', 150000, '55g wireless esports mouse, PAW3395 SE, 70hr battery', 'Ultralight wireless gaming mouse built for esports and long work sessions. The PAW3395 SE optical sensor tracks up to 18,000 DPI at 400 IPS, so aim stays accurate on fast flicks. The symmetrical shell works for palm, claw, and fingertip grips, and the low weight keeps your hand fresh after hours of play.
Connect three ways: 2.4GHz wireless, Bluetooth, or USB-C wired. SmartSpeed X keeps wireless latency low enough for competitive shooters. One charge lasts around 70 hours at 1000Hz, so you charge it once a week, not every night.

Huano micro switches give a crisp click. PTFE feet glide smooth out of the box. Settings adjust through the web driver, no software install needed.', '#858585', 5, 2, 1, 1, 1, 1);


-- =================================================================
-- 5. Product specs
-- =================================================================
INSERT INTO `product_specs` (`product_id`, `label`, `value`, `sort_order`) VALUES
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Brand', '7HZ', 0),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Model', '7Hz x Crinacle Zero:2', 1),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Type', 'In-ear monitor, wired', 2),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Diaphragm', 'PU + metal composite', 3),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Sensitivity', '108dB/V at 1kHz', 4),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Frequency response', '10Hz - 20,000Hz', 5),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Connector', '0.78mm 2-pin detachable', 6),
('7hz-x-crinacle-zero-2-in-ear-monitor', 'Plug', '3.5mm headphone jack', 7),
('arzopa-z1fc-portable-monitor', 'Brand', 'ARZOPA', 0),
('arzopa-z1fc-portable-monitor', 'Screen size', '16.1 inches', 1),
('arzopa-z1fc-portable-monitor', 'Resolution', '1920 x 1080 (FHD)', 2),
('arzopa-z1fc-portable-monitor', 'Refresh rate', '144Hz', 3),
('arzopa-z1fc-portable-monitor', 'Panel type', 'IPS', 4),
('arzopa-z1fc-portable-monitor', 'Colour gamut', '106% sRGB', 5),
('arzopa-z1fc-portable-monitor', 'Weight', '780g', 6),
('arzopa-z1fc-portable-monitor', 'Dimensions', '365 x 275 x 88 mm', 7),
('elite-monitor-arm', 'Material', 'Aluminium alloy, gas spring', 0),
('elite-monitor-arm', 'Monitors supported', '1', 1),
('elite-monitor-arm', 'Screen size', '17 to 27 inch', 2),
('elite-monitor-arm', 'VESA pattern', '75x75 mm, 100x100 mm', 3),
('elite-monitor-arm', 'Mounting', 'Desk clamp or grommet hole', 4),
('keychron-k2-pro', 'Layout', '75% (84 keys)', 0),
('keychron-k2-pro', 'Switches', 'Hot-swap, Red Switches', 1),
('keychron-k2-pro', 'Connection', 'BT 5.1 + 2.4G + USB-C', 2),
('keychron-k2-pro', 'Firmware', 'QMK / VIA', 3),
('logitech-g-pro-x-superlight-2', 'Sensor', 'HERO 2, 32000 DPI', 0),
('logitech-g-pro-x-superlight-2', 'Weight', '< 60 g', 1),
('logitech-g-pro-x-superlight-2', 'Connection', 'LIGHTSPEED 2.4G + USB-C', 2),
('logitech-g-pro-x-superlight-2', 'Battery', '95 hours', 3),
('premium-deskmat', 'Size', '900 × 400 mm', 0),
('premium-deskmat', 'Thickness', '4 mm', 1),
('premium-deskmat', 'Surface', 'Cloth, non-slip rubber base', 2),
('premium-deskmat', 'Care', 'Machine washable', 3),
('vxe-dragonfly-r1-se', 'Sensor', 'PAW3395 SE optical', 0),
('vxe-dragonfly-r1-se', 'Max', '18,000 (10 DPI steps)', 1),
('vxe-dragonfly-r1-se', 'Max speed', '400 IPS', 2),
('vxe-dragonfly-r1-se', 'Polling rate', '125 to 2000 Hz (2K dongle)', 3),
('vxe-dragonfly-r1-se', 'Weight', '55g', 4);


-- =================================================================
-- Bootstrap complete.
-- =================================================================
