(function () {
    'use strict';

    var PLUGIN_NAME = 'NeverShow';
    var STORAGE_KEY = 'never_show_list';

    // ─── Storage helpers ───────────────────────────────────────────────────────

    function getList() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveList(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function getCardId(card) {
        return card.id ? String(card.id) : null;
    }

    function isBlocked(card) {
        var id = getCardId(card);
        if (!id) return false;
        return getList().some(function (item) { return String(item.id) === id; });
    }

    function addToList(card) {
        var id = getCardId(card);
        if (!id) return;
        var list = getList();
        if (list.some(function (item) { return String(item.id) === id; })) return;
        list.push({
            id: id,
            title: card.title || card.name || 'Unknown',
            poster: card.poster || card.img || '',
            type: card.type || 'movie',
            added: Date.now()
        });
        saveList(list);
        Lampa.Noty.show(Lampa.Lang.translate('never_show_added'));
    }

    function removeFromList(id) {
        var list = getList().filter(function (item) { return String(item.id) !== String(id); });
        saveList(list);
    }

    // ─── Filter: hide blocked cards from any rendered list ─────────────────────

    function filterCards(items) {
        if (!Array.isArray(items)) return items;
        return items.filter(function (item) { return !isBlocked(item); });
    }

    // ─── Hook into Lampa events ────────────────────────────────────────────────

    // Filter cards before they are rendered in any list / search / recommendations
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite' && e.data && e.data.results) {
            e.data.results = filterCards(e.data.results);
        }
    });

    // Filter search results
    Lampa.Listener.follow('search', function (e) {
        if (e.type === 'results' && e.results) {
            e.results = filterCards(e.results);
        }
    });

    // Context menu: long-press on a card
    Lampa.Listener.follow('context_menu', function (e) {
        if (!e.card) return;

        var card = e.card;
        var blocked = isBlocked(card);

        e.data.push({
            title: blocked
                ? Lampa.Lang.translate('never_show_unblock')
                : Lampa.Lang.translate('never_show_block'),
            subtitle: blocked ? '' : Lampa.Lang.translate('never_show_subtitle'),
            icon: blocked ? 'like' : 'forbidden',
            action: function () {
                if (blocked) {
                    removeFromList(getCardId(card));
                    Lampa.Noty.show(Lampa.Lang.translate('never_show_removed'));
                } else {
                    addToList(card);
                }
            }
        });
    });

    // Card button (shown on card hover / focus)
    Lampa.Listener.follow('card_add_buttons', function (e) {
        if (!e.card) return;

        var card = e.card;
        var blocked = isBlocked(card);

        e.buttons.push({
            title: blocked
                ? Lampa.Lang.translate('never_show_unblock')
                : Lampa.Lang.translate('never_show_block'),
            icon: blocked ? 'like' : 'forbidden',
            action: function () {
                if (blocked) {
                    removeFromList(getCardId(card));
                    Lampa.Noty.show(Lampa.Lang.translate('never_show_removed'));
                } else {
                    addToList(card);
                }
            }
        });
    });

    // ─── Settings page ─────────────────────────────────────────────────────────

    function renderSettingsPage() {
        var list = getList();

        var html = '<div class="settings-param--ico" style="padding:1em;">';
        html += '<div style="font-size:1.3em;margin-bottom:1em;">' + Lampa.Lang.translate('never_show_title') + '</div>';

        if (list.length === 0) {
            html += '<div style="opacity:.6;">' + Lampa.Lang.translate('never_show_empty') + '</div>';
        } else {
            list.forEach(function (item) {
                html += '<div class="never-show-item" style="display:flex;align-items:center;gap:1em;margin-bottom:.8em;padding:.5em;background:rgba(255,255,255,.05);border-radius:.4em;">';
                if (item.poster) {
                    html += '<img src="' + item.poster + '" style="width:50px;height:75px;object-fit:cover;border-radius:.3em;" />';
                }
                html += '<div style="flex:1"><div>' + item.title + '</div>';
                html += '<div style="font-size:.8em;opacity:.5;">' + new Date(item.added).toLocaleDateString() + '</div></div>';
                html += '<button class="never-show-remove btn" data-id="' + item.id + '" style="padding:.4em .9em;cursor:pointer;">'
                    + Lampa.Lang.translate('never_show_unblock') + '</button>';
                html += '</div>';
            });
        }
        html += '</div>';

        var scroll = new Lampa.Scroll({ mask: true, over: true });
        scroll.body().append(Lampa.Template.js('lamp_scroll', {}));

        var activity = {
            render: function () {
                var wrap = $('<div class="activity--full"></div>');
                wrap.html(html);

                wrap.on('click', '.never-show-remove', function () {
                    var id = $(this).data('id');
                    removeFromList(id);
                    $(this).closest('.never-show-item').remove();
                    Lampa.Noty.show(Lampa.Lang.translate('never_show_removed'));
                });

                return wrap;
            },
            destroy: function () {}
        };

        Lampa.Activity.push({
            url: '',
            title: Lampa.Lang.translate('never_show_title'),
            component: 'never_show_list',
            page: 1
        });
    }

    // Register list component
    Lampa.Component.add('never_show_list', {
        create: function () {
            var _this = this;
            var list = getList();

            var html = '<div style="padding:2em 3em;">';
            html += '<div style="font-size:1.4em;margin-bottom:1.5em;font-weight:bold;">'
                + Lampa.Lang.translate('never_show_title') + '</div>';

            if (list.length === 0) {
                html += '<div style="opacity:.6;font-size:1.1em;">' + Lampa.Lang.translate('never_show_empty') + '</div>';
            } else {
                list.forEach(function (item) {
                    html += '<div class="never-show-item selector" style="display:flex;align-items:center;gap:1.2em;margin-bottom:1em;padding:.8em 1em;background:rgba(255,255,255,.06);border-radius:.5em;" data-id="' + item.id + '">';
                    if (item.poster) {
                        html += '<img src="' + item.poster + '" style="width:55px;height:80px;object-fit:cover;border-radius:.3em;" />';
                    }
                    html += '<div style="flex:1"><div style="font-size:1.1em;">' + item.title + '</div>';
                    html += '<div style="font-size:.8em;opacity:.5;margin-top:.3em;">' + new Date(item.added).toLocaleDateString() + '</div></div>';
                    html += '<div style="opacity:.5;font-size:.9em;">' + Lampa.Lang.translate('never_show_press_ok') + '</div>';
                    html += '</div>';
                });
            }
            html += '</div>';

            this.activity.loader(false);

            var body = $('<div class="layer--wheight layer--scroll"></div>');
            body.html(html);

            body.on('click', '.never-show-item', function () {
                var id = $(this).data('id');
                removeFromList(id);
                $(this).fadeOut(300, function () { $(this).remove(); });
                Lampa.Noty.show(Lampa.Lang.translate('never_show_removed'));
            });

            this.activity.render(body);
        },
        render: function () { return this.activity.content; },
        pause: function () {},
        resume: function () {},
        destroy: function () {}
    });

    // ─── Settings menu item ────────────────────────────────────────────────────

    Lampa.Listener.follow('settings', function (e) {
        if (e.type !== 'open') return;

        Lampa.Settings.add(PLUGIN_NAME, {
            name: Lampa.Lang.translate('never_show_settings'),
            icon: 'forbidden',
            child: {
                open_list: {
                    name: Lampa.Lang.translate('never_show_open_list'),
                    type: 'button',
                    action: function () {
                        Lampa.Activity.push({
                            url: '',
                            title: Lampa.Lang.translate('never_show_title'),
                            component: 'never_show_list',
                            page: 1
                        });
                    }
                },
                clear_all: {
                    name: Lampa.Lang.translate('never_show_clear'),
                    type: 'button',
                    action: function () {
                        saveList([]);
                        Lampa.Noty.show(Lampa.Lang.translate('never_show_cleared'));
                    }
                }
            }
        });
    });

    // ─── Translations ──────────────────────────────────────────────────────────

    Lampa.Lang.add({
        never_show_block:    { ru: 'Ніколи не показувати', uk: 'Ніколи не показувати', en: 'Never show' },
        never_show_unblock:  { ru: 'Розблокувати', uk: 'Розблокувати', en: 'Unblock' },
        never_show_subtitle: { ru: 'Зникне з усіх списків', uk: 'Зникне з усіх списків', en: 'Will disappear from all lists' },
        never_show_added:    { ru: 'Додано до прихованих', uk: 'Додано до прихованих', en: 'Added to hidden list' },
        never_show_removed:  { ru: 'Видалено з прихованих', uk: 'Видалено з прихованих', en: 'Removed from hidden list' },
        never_show_title:    { ru: 'Приховані фільми', uk: 'Приховані фільми', en: 'Hidden movies' },
        never_show_empty:    { ru: 'Список порожній', uk: 'Список порожній', en: 'List is empty' },
        never_show_press_ok: { ru: 'OK — розблокувати', uk: 'OK — розблокувати', en: 'OK to unblock' },
        never_show_settings: { ru: 'Приховані фільми', uk: 'Приховані фільми', en: 'Hidden movies' },
        never_show_open_list:{ ru: 'Переглянути список', uk: 'Переглянути список', en: 'View list' },
        never_show_clear:    { ru: 'Очистити все', uk: 'Очистити все', en: 'Clear all' },
        never_show_cleared:  { ru: 'Список очищено', uk: 'Список очищено', en: 'List cleared' }
    });

    console.log('[NeverShow] Plugin loaded');
})();
