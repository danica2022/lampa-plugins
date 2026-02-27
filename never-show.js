// NeverShow Plugin v1.2
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

    function openList() {
        var list = getList();
        var html = '<div style="padding:2em 3em;">';

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

        Lampa.Modal.open({
            title: '🚫 Приховані фільми',
            html: body,
            size: 'medium',
            onBack: function () { Lampa.Modal.close(); }
        });
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
        Lampa.Listener.follow('context', function (e) {
            if (e.type === 'complite' && e.card) {
                var card = e.card;
                var blocked = isBlocked(card);
                e.data.push({
                    title: blocked ? '✅ Розблокувати' : '🚫 Ніколи не показувати',
                    action: function () {
                        if (blocked) unblock(String(card.id));
                        else block(card);
                    }
                });
            }
        });

        // Кнопки на картці фільму
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'build' && e.name === 'start' && e.object) {
                var card = e.object.activity && e.object.activity.card;
                if (!card) return;
                var blocked = isBlocked(card);
                e.html.find('.full-start__buttons, .full-start-new__buttons').append(
                    $('<div class="full-start__button selector ns-btn" style="cursor:pointer;">' +
                        '<div class="full-start__button-icon">' +
                        (blocked ? '✅' : '🚫') +
                        '</div>' +
                        '<div class="full-start__button-name">' +
                        (blocked ? 'Розблокувати' : 'Ніколи не показувати') +
                        '</div></div>'
                    ).on('click', function () {
                        if (blocked) unblock(String(card.id));
                        else block(card);
                    })
                );
            }
        });
    }

    // Створюємо розділ в налаштуваннях
    Lampa.SettingsApi.addComponent({
        component: 'never_show',
        name: '🚫 Приховані фільми',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
    });

    Lampa.SettingsApi.addParam({
        component: 'never_show',
        param: {
            name: 'never_show_open',
            type: 'button',
            default: false
        },
        field: {
            name: 'Переглянути список прихованих фільмів',
            description: 'Тут можна розблокувати фільми'
        },
        onChange: function () {
            openList();
        }
    });

    Lampa.SettingsApi.addParam({
        component: 'never_show',
        param: {
            name: 'never_show_clear',
            type: 'button',
            default: false
        },
        field: {
            name: 'Очистити весь список',
            description: 'Видалити всі приховані фільми'
        },
        onChange: function () {
            saveList([]);
            Lampa.Noty.show('Список очищено');
        }
    });

    if (!window.nevershowplugin) startPlugin();

})();
