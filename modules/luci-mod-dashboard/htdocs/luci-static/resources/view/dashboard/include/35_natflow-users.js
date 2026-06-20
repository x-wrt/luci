'use strict';
'require baseclass';
'require dom';
'require rpc';
'require uci';
'require network';

var callLuciGetUsers = rpc.declare({
	object: 'luci.natflow',
	method: 'get_users',
	expect: { result: [] }
});

var callBlockUser = rpc.declare({
	object: 'luci.natflow',
	method: 'block_user',
	params: [ 'token' ],
	expect: { result : "OK" },
});

var callAllowUser = rpc.declare({
	object: 'luci.natflow',
	method: 'allow_user',
	params: [ 'token' ],
	expect: { result : "OK" },
});

var callLuciDHCPLeases = rpc.declare({
	object: 'luci-rpc',
	method: 'getDHCPLeases',
	expect: { '': {} }
});

// ✨ 修改点 1：让按钮支持批量操作（传入 IP 数组），彻底阻断/放行该设备的所有 IP
var handleBlockUser = function(ips, ev) {
	dom.parent(ev.currentTarget, '.tr').style.opacity = 0.5;
	ev.currentTarget.classList.add('spinning');
	ev.currentTarget.disabled = true;
	ev.currentTarget.blur();
	ips.forEach(function(ip) { callBlockUser(ip); });
};

var handleAllowUser = function(ips, ev) {
	dom.parent(ev.currentTarget, '.tr').style.opacity = 0.5;
	ev.currentTarget.classList.add('spinning');
	ev.currentTarget.disabled = true;
	ev.currentTarget.blur();
	ips.forEach(function(ip) { callAllowUser(ip); });
};

var pollInterval = 5;

Math.log2 = Math.log2 || function(x) { return Math.log(x) * Math.LOG2E; };

function rate(n, br) {
	n = (n || 0).toFixed(2);
	return '%1024.2mbit/s (%1024.2mB/s)'.format(n * 8, n)
}

return baseclass.extend({
	title: _('Active Users'),

	load: function() {
		return Promise.all([
			network.getHostHints(),
			callLuciGetUsers(),
			network.getWifiNetworks().then(function(networks) {
				var tasks = [];
				for (var i = 0; i < networks.length; i++) {
					tasks.push(L.resolveDefault(networks[i].getAssocList(), []).then(L.bind(function(net, list) {
						net.assoclist = list || [];
					}, this, networks[i])));
				}
				return Promise.all(tasks).then(function() { return networks; });
			}),
			callLuciDHCPLeases()
		]);
	},

	render: function(data) {
		var wrapper = E('div', { 'class': 'active-users-self dashboard-bg box-s1', 'style': 'padding: 1.5em; margin-bottom: 20px;' });

		wrapper.appendChild(E('div', { 'class': 'title', 'style': 'text-align: center; margin-bottom: 20px;' }, [
			E('img', {
				'src': L.resource('view/dashboard/icons/devices.svg'),
				'width': 55,
				'title': this.title,
				'class': 'middle svgmonotone',
				'style': 'display: inline-block; vertical-align: middle; margin-right: 10px;'
			}),
			E('h3', { 'style': 'display: inline-block; vertical-align: middle; margin: 0;' }, this.title)
		]));

		wrapper.appendChild(E('style', {}, `
			.active-users-table { display: flex !important; flex-direction: column; width: 100%; border: none !important; }
			.active-users-table tbody { display: flex; flex-direction: column; width: 100%; }
			.active-users-table .tr { display: flex; align-items: center; padding: 12px 8px; border-bottom: 1px solid rgba(0,0,0,0.05); transition: opacity 0.3s ease; }
			.active-users-table .table-titles { font-weight: 600; color: #6c757d; background: transparent !important; }
			.active-users-table .td, .active-users-table .th { border: none !important; padding: 8px 10px; word-break: break-all; }

			.active-users-table .th:nth-child(1), .active-users-table .td:nth-child(1) { flex: 1 1 30%; }
			.active-users-table .th:nth-child(2), .active-users-table .td:nth-child(2) { flex: 1 1 25%; }
			.active-users-table .th:nth-child(3), .active-users-table .td:nth-child(3) { flex: 1 1 35%; }
			.active-users-table .th:nth-child(4), .active-users-table .td:nth-child(4) { flex: 0 0 80px; text-align: right; }

			@media screen and (max-width: 800px) {
				.active-users-table .table-titles { display: none !important; }
				.active-users-table .tr:not(.table-titles) {
					flex-direction: row; flex-wrap: wrap; align-items: flex-start;
					background: rgba(0,0,0,0.02); border-radius: 12px; margin-bottom: 12px;
					padding: 12px 16px; border: 1px solid rgba(0,0,0,0.05) !important;
				}
				.active-users-table .td { flex: 1 1 100% !important; text-align: left !important; padding: 4px 0 !important; }

				.active-users-table .td:nth-child(1) { order: 1; flex: 1 1 65% !important; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px !important; margin-bottom: 8px !important; }
				.active-users-table .td:nth-child(4) { order: 2; flex: 1 1 35% !important; text-align: right !important; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px !important; margin-bottom: 8px !important; display: flex; justify-content: flex-end; align-items: flex-start; }

				.active-users-table .td:nth-child(2) { order: 3; flex: 1 1 45% !important; background: rgba(255,255,255,0.5); padding: 8px !important; border-radius: 6px 0 0 6px; border-right: 1px solid rgba(0,0,0,0.05); }
				.active-users-table .td:nth-child(3) { order: 4; flex: 1 1 55% !important; background: rgba(255,255,255,0.5); padding: 8px !important; border-radius: 0 6px 6px 0; }
			}

			[data-darkmode="true"] .active-users-table .tr:not(.table-titles) { background: rgba(255,255,255,0.03); }
			[data-darkmode="true"] .active-users-table .td:nth-child(2), [data-darkmode="true"] .active-users-table .td:nth-child(3) { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.05); }
		`));

		var table = E('table', { 'class': 'table modern-flex-table active-users-table', 'id': 'users' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, [ _('Device Info') ]),
				E('th', { 'class': 'th' }, [ _('Connection') ]),
				E('th', { 'class': 'th' }, [ _('Traffic (RX / TX)') ]),
				E('th', { 'class': 'th cbi-section-actions' }, [ _('Internet') ])
			]),
			E('tr', { 'class': 'tr placeholder' }, [
				E('td', { 'class': 'td' }, [
					E('em', {}, [ _('Collecting data...') ])
				])
			])
		]);

		var hosts = data[0];
		var rawUsers = Array.isArray(data[1]) ? data[1] : [];
		var wifiNetworks = data[2] || [];
		var dhcpData = data[3] || {};
		var dhcpLeases = dhcpData.dhcp_leases || [];

		// ✨ 修改点 2：将散乱的记录按 MAC 地址聚合 (处理多 IP 场景)
		var mergedUsersMap = {};
		rawUsers.forEach(function(u) {
			if (!u.mac) return;
			var mac = u.mac.toUpperCase();

			if (!mergedUsersMap[mac]) {
				// 第一次遇到这个 MAC，初始化数据结构
				mergedUsersMap[mac] = {
					mac: mac,
					ips: [ u.ip ], // 使用数组存储多个 IP
					rx_bytes: u.rx_bytes || 0,
					tx_bytes: u.tx_bytes || 0,
					rx_speed_bytes: u.rx_speed_bytes || 0,
					tx_speed_bytes: u.tx_speed_bytes || 0,
					status: u.status
				};
			} else {
				// 再次遇到相同的 MAC，累加流量并记录新 IP
				if (mergedUsersMap[mac].ips.indexOf(u.ip) === -1) {
					mergedUsersMap[mac].ips.push(u.ip);
				}
				mergedUsersMap[mac].rx_bytes += (u.rx_bytes || 0);
				mergedUsersMap[mac].tx_bytes += (u.tx_bytes || 0);
				mergedUsersMap[mac].rx_speed_bytes += (u.rx_speed_bytes || 0);
				mergedUsersMap[mac].tx_speed_bytes += (u.tx_speed_bytes || 0);
				// 如果该设备有任何一个 IP 处于被拉黑状态(6)，则将整个设备状态视为拉黑
				if (u.status == 6) {
					mergedUsersMap[mac].status = 6;
				}
			}
		});

		// 将字典转回数组，并按照累加后的总下载流量排序
		var users = Object.values(mergedUsersMap);
		users.sort(function(a, b) {
			return b.rx_bytes - a.rx_bytes;
		});

		var wifiClientsMap = {};
		for (var i = 0; i < wifiNetworks.length; i++) {
			var net = wifiNetworks[i];
			var ssid = net.getActiveSSID() || '?';
			var list = net.assoclist || [];
			for (var j = 0; j < list.length; j++) {
				var bss = list[j];
				if (bss && bss.mac) {
					wifiClientsMap[bss.mac.toUpperCase()] = {
						ssid: ssid,
						signal: bss.signal,
						noise: bss.noise
					};
				}
			}
		}

		var leaseMap = {};
		for (var k = 0; k < dhcpLeases.length; k++) {
			var lease = dhcpLeases[k];
			if (lease && lease.macaddr) {
				leaseMap[lease.macaddr.toUpperCase()] = lease.expires;
			}
		}

		var rows = users.map(function(u) {
			var mac = u.mac.toUpperCase();
			var name = hosts.getHostnameByMACAddr(mac);

			var expNode = '';
			if (leaseMap[mac] !== undefined) {
				var expires = leaseMap[mac];
				if (expires === false)
					expNode = E('em', _('unlimited'));
				else if (expires <= 0)
					expNode = E('em', _('expired'));
				else
					expNode = '%t'.format(expires);
			}

			// 列 1：设备名 + MAC
			var nodeDeviceInfo = E('div', {}, [
				E('div', { 'style': 'font-weight: 600; font-size: 14px;' }, name || '?'),
				E('div', { 'class': 'text-muted', 'style': 'font-family: monospace; font-size: 12px; opacity: 0.7;' }, mac)
			]);

			// ✨ 修改点 3：循环渲染该设备所有的 IPv4/IPv6 地址
			u.ips.forEach(function(ipStr) {
				nodeDeviceInfo.appendChild(
					E('div', { 'style': 'font-family: monospace; font-size: 13px; margin-top: 3px; color: var(--bs-info, #0dcaf0); word-break: break-all;' }, ipStr)
				);
			});

			if (expNode !== '') {
				nodeDeviceInfo.appendChild(
					E('div', { 'style': 'font-size: 11px; color: #6c757d; margin-top: 3px;' }, [
						E('span', { 'style': 'opacity: 0.8; margin-right: 2px;' }, '⏳ '),
						expNode
					])
				);
			}

			// 列 2：接入信息逻辑
			var nodeConnection;
			var wInfo = wifiClientsMap[mac];
			if (wInfo) {
				var defaultNF = -90;
				var defaultCeil = -30;
				var noise = wInfo.noise || defaultNF;
				var q = Math.max(0, Math.min(100, 100 * ((wInfo.signal - noise) / (defaultCeil - noise))));
				var qColor = (q < 25) ? '#dc3545' : ((q < 50) ? '#ffc107' : '#198754');

				nodeConnection = E('div', {}, [
					E('div', { 'style': 'display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: rgba(13, 110, 253, 0.1); color: #0d6efd; margin-bottom: 4px;' }, _('Wireless')),
					E('div', { 'style': 'font-size: 13px; font-weight: 600;' }, wInfo.ssid),
					E('div', { 'style': 'font-size: 12px; margin-top: 2px; color: #6c757d;' }, [
						E('span', { 'style': `display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${qColor}; margin-right: 5px;` }),
						`${wInfo.signal} dBm (${parseInt(q)}%)`
					])
				]);
			} else {
				nodeConnection = E('div', {}, [
					E('div', { 'style': 'display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: rgba(25, 135, 84, 0.1); color: #198754; margin-bottom: 4px;' }, _('Wired')),
					E('div', { 'style': 'font-size: 13px; color: #6c757d; margin-top: 2px;' }, 'LAN')
				]);
			}

			// 列 3：聚合后的 RX 和 TX 流量
			var nodeTraffic = E('div', { 'style': 'display: flex; gap: 10px; flex-direction: column;' }, [
				E('div', {}, [
					E('div', { 'style': 'color: var(--bs-success, #198754); font-weight: 600; font-size: 13px;' }, [ E('span', '↓ '), '%1024.2mB'.format(u.rx_bytes) ]),
					E('div', { 'style': 'font-size: 11px; opacity: 0.7; margin-top: 2px;' }, rate(u.rx_speed_bytes))
				]),
				E('div', {}, [
					E('div', { 'style': 'color: var(--bs-primary, #0d6efd); font-weight: 600; font-size: 13px;' }, [ E('span', '↑ '), '%1024.2mB'.format(u.tx_bytes) ]),
					E('div', { 'style': 'font-size: 11px; opacity: 0.7; margin-top: 2px;' }, rate(u.tx_speed_bytes))
				])
			]);

			// 列 4：按钮逻辑，绑定所有的 IPs
			var isBlocked = (u.status == 6);
			var btnText = isBlocked ? _('Disabled') : _('Enabled');
			var btnClass = isBlocked ? 'btn cbi-button-negative' : 'btn cbi-button-positive';
			var btnHandler = isBlocked ? handleAllowUser : handleBlockUser;

			var nodeBtn = E('button', {
				'class': btnClass,
				'style': 'padding: 4px 10px; font-size: 12px; border-radius: 4px; min-width: 60px;',
				'click': L.bind(btnHandler, this, u.ips) // 传入的是 IP 数组
			}, [ btnText ]);

			return [ nodeDeviceInfo, nodeConnection, nodeTraffic, nodeBtn ];
		});

		cbi_update_table(table, rows, E('em', _('No information available')));

		wrapper.appendChild(table);
		return wrapper;
	}
});
