'use strict';
'require baseclass';
'require form';
'require fs';
'require uci';

return baseclass.extend({
	trigger: _('Network switch'),
	description: _('This LED trigger can be used for signalling network switch state.'),
	kernel: false,
	addFormOptions(s) {
		var o;
		var device;

		device = s.option(form.ListValue, 'switch_device', _('Device'));
		device.modalonly = true;
		device.ucioption = "device";
		device.depends('trigger', 'switch');
		device.load = function(s) {
			return  L.resolveDefault(fs.exec_direct('/sbin/swconfig', [ 'list' ], '').then(function(res) {
				var lines = res.split(/\n/);
				for (var i = 0; i < lines.length; i++) {
					var values = lines[i].split(/\s+/);
					for (var j = 0; j < values.length; j++) {
						if (j == 1)
							device.value(values[j]);
					}
				}
			}, this));
		};
		device.cfgvalue = function (section_id) {
			return uci.get('system', section_id, 'device');
		}

		o = s.option(form.Value, 'switch_port_mask', _('Switch Port Mask'));
		o.modalonly = true;
		o.ucioption = "port_mask";
		o.depends('trigger', 'switch');i
		o.cfgvalue = function (section_id) {
			return uci.get('system', section_id, 'port_mask');
		}


		o = s.option(form.Value, 'switch_speed_mask', _('Switch Speed Mask'));
		o.modalonly = true;
		o.ucioption = "speed_mask";
		o.depends('trigger', 'switch');
		o.cfgvalue = function (section_id) {
			return uci.get('system', section_id, 'speed_mask');
		}

		o = s.option(form.MultiValue, 'switch_mode', _('Trigger Mode'));
		o.rmempty = true;
		o.modalonly = true;
		o.ucioption = "mode";
		o.depends('trigger', 'switch');
		o.value('link', _('Link On'));
		o.value('tx', _('Transmit'));
		o.value('rx', _('Receive'));
		o.cfgvalue = function (section_id) {
			return uci.get('system', section_id, 'mode');
		}
	}
});
