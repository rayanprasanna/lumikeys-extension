/*
 * LumiKeys: Keyboard Backlight Symphony
 * 
 * Copyright (C) [2024] [Delath Rayan Prasanna De Zoysa]
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


const { GObject, St, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const LumiKeysBacklightControl = GObject.registerClass(
class LumiKeysBacklightControl extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'LumiKeys Backlight');
        
        // Create indicator icon
        this._icon = new St.Icon({
            icon_name: 'keyboard-brightness-symbolic',
            style_class: 'system-status-icon'
        });
        this.add_child(this._icon);

        // Create slider for backlight control
        this._slider = new PopupMenu.PopupSliderMenuItem(0.5);
        this._slider.connect('value-changed', this._onSliderChanged.bind(this));
        this.menu.addMenuItem(this._slider);

        // Get current backlight level
        this._updateCurrentBacklight();
    }

    _updateCurrentBacklight() {
        try {
            // Use pkexec to read backlight level with appropriate permissions
            let [res, out, err, status] = GLib.spawn_command_line_sync(
                'pkexec /bin/bash -c "cat /sys/class/leds/*/brightness"'
            );
            
            if (status === 0) {
                let currentBrightness = parseInt(out.toString().trim());
                let maxBrightness = this._getMaxBrightness();
                this._slider.value = currentBrightness / maxBrightness;
            }
        } catch (e) {
            log(`LumiKeys: Error reading backlight: ${e}`);
        }
    }

    _getMaxBrightness() {
        try {
            let [res, out, err, status] = GLib.spawn_command_line_sync(
                'pkexec /bin/bash -c "cat /sys/class/leds/*/max_brightness"'
            );
            
            if (status === 0) {
                return parseInt(out.toString().trim());
            }
            return 255; // default fallback
        } catch (e) {
            log(`LumiKeys: Error reading max brightness: ${e}`);
            return 255;
        }
    }

    _onSliderChanged() {
        let maxBrightness = this._getMaxBrightness();
        let newBrightness = Math.round(this._slider.value * maxBrightness);
        
        try {
            // Use pkexec to write backlight level with appropriate permissions
            let result = GLib.spawn_command_line_sync(
                `pkexec /bin/bash -c "echo ${newBrightness} > /sys/class/leds/*/brightness"`
            );
        } catch (e) {
            log(`LumiKeys: Error setting backlight: ${e}`);
            Main.notifyError('LumiKeys', 'Could not change keyboard backlight level');
        }
    }
});

let backlightIndicator;

function init() {
    return new LumiKeysBacklightControl();
}

function enable() {
    backlightIndicator = new LumiKeysBacklightControl();
    Main.panel.addToStatusArea('lumikeys-backlight', backlightIndicator);
}

function disable() {
    if (backlightIndicator) {
        backlightIndicator.destroy();
        backlightIndicator = null;
    }
}
