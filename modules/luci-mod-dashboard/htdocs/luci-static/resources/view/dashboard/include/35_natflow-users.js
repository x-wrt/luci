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

var handleBlockUser = function(num, ev) {
	dom.parent(ev.currentTarget, '.tr').style.opacity = 0.5;
	ev.currentTarget.classList.add('spinning');
	ev.currentTarget.disabled = true;
	ev.currentTarget.blur();
	callBlockUser(num);
};

var handleAllowUser = function(num, ev) {
	dom.parent(ev.currentTarget, '.tr').style.opacity = 0.5;
	ev.currentTarget.classList.add('spinning');
	ev.currentTarget.disabled = true;
	ev.currentTarget.blur();
	callAllowUser(num);
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

		// 💡 注意：所有的排版魔法（包括修复错位）都在这里的内嵌 style 中！
		wrapper.appendChild(E('style', {}, `
			.active-users-table { display: flex !important; flex-direction: column; width: 100%; border: none !important; }
			.active-users-table tbody { display: flex; flex-direction: column; width: 100%; }
			.active-users-table .tr { display: flex; align-items: center; padding: 12px 8px; border-bottom: 1px solid rgba(0,0,0,0.05); transition: opacity 0.3s ease; }
			.active-users-table .table-titles { font-weight: 600; color: #6c757d; background: transparent !important; }
			.active-users-table .td, .active-users-table .th { border: none !important; padding: 8px 10px; word-break: break-all; }

			.active-users-table .th:nth-child(1), .active-users-table .td:nth-child(1) { flex: 1 1 30%; }
			.active-users-table .th:nth-child(2), .active-users-table .td:nth-child(2) { flex: 1 1 20%; }
			.active-users-table .th:nth-child(3), .active-users-table .td:nth-child(3) { flex: 1 1 20%; }
			.active-users-table .th:nth-child(4), .active-users-table .td:nth-child(4) { flex: 1 1 20%; }
			.active-users-table .th:nth-child(5), .active-users-table .td:nth-child(5) { flex: 0 0 80px; text-align: right; }

			@media screen and (max-width: 800px) {
				.active-users-table .table-titles { display: none !important; }
				.active-users-table .tr:not(.table-titles) {
					flex-direction: row; flex-wrap: wrap; align-items: flex-start;
					background: rgba(0,0,0,0.02); border-radius: 12px; margin-bottom: 12px;
					padding: 12px 16px; border: 1px solid rgba(0,0,0,0.05) !important;
				}
				.active-users-table .td { flex: 1 1 100% !important; text-align: left !important; padding: 4px 0 !important; }

				/* ⚠️ 核心魔法：使用 order 强行改变渲染顺序，修复按钮错位和 IPv6 截断 */
				.active-users-table .td:nth-child(1) { order: 1; flex: 1 1 65% !important; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px !important; margin-bottom: 8px !important; }
				.active-users-table .td:nth-child(5) { order: 2; flex: 1 1 35% !important; text-align: right !important; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px !important; margin-bottom: 8px !important; display: flex; justify-content: flex-end; align-items: flex-start; }

				.active-users-table .td:nth-child(2) { order: 3; flex: 1 1 100% !important; margin-bottom: 8px !important; white-space: normal !important; word-break: break-all !important; overflow-wrap: break-word !important; }

				.active-users-table .td:nth-child(3) { order: 4; flex: 1 1 calc(50% - 4px) !important; margin-right: 4px; background: rgba(255,255,255,0.5); padding: 8px !important; border-radius: 6px; }
				.active-users-table .td:nth-child(4) { order: 5; flex: 1 1 calc(50% - 4px) !important; margin-left: 4px; background: rgba(255,255,255,0.5); padding: 8px !important; border-radius: 6px; }
			}

			[data-darkmode="true"] .active-users-table .tr:not(.table-titles) { background: rgba(255,255,255,0.03); }
			[data-darkmode="true"] .active-users-table .td:nth-child(3), [data-darkmode="true"] .active-users-table .td:nth-child(4) { background: rgba(0,0,0,0.2); }
		`));

		var table = E('table', { 'class': 'table modern-flex-table active-users-table', 'id': 'users' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, [ _('Hostname') + ' & MAC' ]),
				E('th', { 'class': 'th' }, [ _('IP Address') ]),
				E('th', { 'class': 'th' }, [ _('Traffic (RX)') ]),
				E('th', { 'class': 'th' }, [ _('Traffic (TX)') ]),
				E('th', { 'class': 'th cbi-section-actions' }, [ _('Internet') ])
			]),
			E('tr', { 'class': 'tr placeholder' }, [
				E('td', { 'class': 'td' }, [
					E('em', {}, [ _('Collecting data...') ])
				])
			])
		]);

		var hosts = data[0];
		var users = Array.isArray(data[1]) ? data[1] : [];

		users.sort(function(a, b) {
			return b.rx_bytes - a.rx_bytes;
		});

		var rows = users.map(function(u) {
			var mac = u.mac.toUpperCase();
			var name = hosts.getHostnameByMACAddr(mac);

			var nodeDevice = E('div', {}, [
				E('div', { 'style': 'font-weight: 600; font-size: 14px;' }, name || '?'),
				E('div', { 'class': 'text-muted', 'style': 'font-family: monospace; font-size: 12px; opacity: 0.7;' }, mac)
			]);

			var nodeIp = E('p', { 'style': 'font-family: monospace; font-size: 14px;' }, u.ip);

			var nodeRx = E('div', {}, [
				E('div', { 'style': 'color: var(--bs-success, #198754); font-weight: 600; font-size: 13px;' }, [ E('span', '↓ '), '%1024.2mB'.format(u.rx_bytes) ]),
				E('div', { 'style': 'font-size: 11px; opacity: 0.7; margin-top: 2px;' }, rate(u.rx_speed_bytes))
			]);

			var nodeTx = E('div', {}, [
				E('div', { 'style': 'color: var(--bs-primary, #0d6efd); font-weight: 600; font-size: 13px;' }, [ E('span', '↑ '), '%1024.2mB'.format(u.tx_bytes) ]),
				E('div', { 'style': 'font-size: 11px; opacity: 0.7; margin-top: 2px;' }, rate(u.tx_speed_bytes))
			]);

			var isBlocked = (u.status == 6);
			var btnText = isBlocked ? _('Disabled') : _('Enabled');
			var btnClass = isBlocked ? 'btn cbi-button-negative' : 'btn cbi-button-positive';
			var btnHandler = isBlocked ? handleAllowUser : handleBlockUser;

			var nodeBtn = E('button', {
				'class': btnClass,
				'style': 'padding: 4px 10px; font-size: 12px; border-radius: 4px; min-width: 60px;',
				'click': L.bind(btnHandler, this, u.ip)
			}, [ btnText ]);

			return [ nodeDevice, nodeIp, nodeRx, nodeTx, nodeBtn ];
		});

		cbi_update_table(table, rows, E('em', _('No information available')));

		wrapper.appendChild(table);
		return wrapper;
	}
});
