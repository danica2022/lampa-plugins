(function () {
    'use strict';

    var STORAGE_KEY = 'never_show_list';

    function getList() {
        try { return JSON.parse(Lampa.Storage.get(STORAGE_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveList(list) {
        Lampa.Storage.set(STORAGE_KEY, JSON.stringify(list));
    }

    function isBlocked(card) {
        if (!card || !card.id) return false;
        return getList().some(function (i) { return String(i.id) === String(card.id); });
    }

    function block(card) {
        if (!card || !card.id || isBlocked(card)) return;
        var list = getList();
        list.push({
            id: String(card.id),
            title: card.title || card.name || '—',
            poster: card.poster || '',
            type: card.type || 'movie'
        });
        saveList(list);
        Lampa.Noty.show('Додано до прихованих');
    }

    function unblock(id) {
        saveList(getList().filter(function (i) { return String(i.id) !== String(id); }));
        Lampa.Noty.show('Видалено з прихованих');
    }

    function startPlugin() {
        window.nevershowplugin = true;

        // Фільтрувати картки у всіх списках
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.data && Array.isArray(e.data.results)) {
                e.data.results = e.data.results.filter(function (c) { return !isBlocked(c); });
            }
        });

        // Контекстне меню (довге натискання)
        Lampa.Listener.follow('context_menu', function (e) {
            if (!e.card) return;
            var card = e.card;
            var blocked = isBlocked(card);
            e.data.push({
                title: blocked ? '✅ Розблокувати' : '🚫 Ніколи не показувати',
                action: function () {
                    if (blocked) unblock(String(card.id));
                    else block(card);
                }
            });
        });

        // Кнопки на картці
        Lampa.Listener.follow('card_add_buttons', function (e) {
            if (!e.card) return;
            var card = e.card;
            var blocked = isBlocked(card);
            e.buttons.push({
                title: blocked ? 'Розблокувати' : 'Ніколи не показувати',
                icon: 'forbidden',
                action: function () {
                    if (blocked) unblock(String(card.id));
                    else block(card);
                }
            });
        });

        // Компонент списку прихованих
        Lampa.Component.add('never_show_list', {
            create: function () {
                var _this = this;
                var list = getList();

                var html = '<div style="padding:2em 3em;">';
                html += '<div style="font-size:1.4em;margin-bottom:1.5em;font-weight:bold;">🚫 Приховані фільми</div>';

                if (!list.length) {
                    html += '<div style="opacity:.6;font-size:1.1em;">Список порожній</div>';
                } else {
                    list.forEach(function (item) {
                        html += '<div class="ns-item selector" data-id="' + item.id + '" style="display:flex;align-items:center;gap:1.2em;margin-bottom:1em;padding:.8em 1em;background:rgba(255,255,255,.06);border-radius:.5em;cursor:pointer;">';
                        if (item.poster) html += '<img src="' + item.poster + '" style="width:55px;height:80px;object-fit:cover;border-radius:.3em;">';
                        html += '<div style="flex:1">';
                        html += '<div style="font-size:1.1em;">' + item.title + '</div>';
                        html += '<div style="font-size:.8em;opacity:.5;margin-top:.3em;">Натисніть OK щоб розблокувати</div>';
                        html += '</div></div>';
                    });
                    html += '<div style="margin-top:1.5em;"><button class="ns-clear selector" style="padding:.5em 1.4em;font-size:1em;">🗑️ Очистити весь список</button></div>';
                }
                html += '</div>';

                var body = $(html);

                body.on('click', '.ns-item', function () {
                    var id = $(this).data('id');
                    unblock(id);
                    $(this).fadeOut(300, function () { $(this).remove(); });
                });

                body.on('click', '.ns-clear', function () {
                    saveList([]);
                    Lampa.Noty.show('Список очищено');
                    body.find('.ns-item').remove();
                    $(this).closest('div').remove();
                });

                _this.activity.loader(false);
                _this.activity.render(body);
            },
            pause: function () {},
            resume: function () {},
            destroy: function () {}
        });
    }

    // Налаштування — одразу, без слухачів
    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'never_show_open',
            type: 'button',
            default: false
        },
        field: {
            name: '🚫 Приховані фільми',
            description: 'Переглянути та розблокувати приховані фільми'
        },
        onChange: function () {
            Lampa.Activity.push({
                url: '',
                title: 'Приховані фільми',
                component: 'never_show_list',
                page: 1
            });
        }
    });

    if (!window.nevershowplugin) startPlugin();

})();
