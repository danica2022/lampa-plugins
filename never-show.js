// NeverShow Plugin v1.7
(function () {
    'use strict';

    var STORAGE_KEY = 'never_show_list';

    function getList() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function saveList(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
        catch (e) { console.error('[NeverShow] saveList error:', e); }
    }

    function getId(card) {
        return card && card.id ? String(card.id) : null;
    }

    function isBlocked(card) {
        var id = getId(card);
        if (!id) return false;
        return getList().some(function (i) { return String(i.id) === id; });
    }

    function block(card) {
        var id = getId(card);
        if (!id || isBlocked(card)) return;
        var list = getList();
        list.push({
            id: id,
            title: card.title || card.name || '—',
            poster: card.poster || card.poster_path || '',
            type: card.type || 'movie'
        });
        saveList(list);
        Lampa.Noty.show('🚫 Додано до прихованих');
    }

    function unblock(id) {
        saveList(getList().filter(function (i) { return String(i.id) !== String(id); }));
        Lampa.Noty.show('✅ Видалено з прихованих');
    }

    function filterResults(items) {
        if (!Array.isArray(items)) return items;
        return items.filter(function (c) { return !isBlocked(c); });
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
                html += '<div style="flex:1"><div style="font-size:1.1em;">' + item.title + '</div>';
                html += '<div style="font-size:.8em;opacity:.5;margin-top:.3em;">Натисніть щоб розблокувати</div></div></div>';
            });
            html += '<div style="margin-top:1.5em;"><button class="ns-clear selector" style="padding:.5em 1.4em;">🗑️ Очистити все</button></div>';
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
        });

        Lampa.Modal.open({
            title: '🚫 Приховані фільми',
            html: body,
            size: 'medium',
            onBack: function () { Lampa.Modal.close(); }
        });
    }

    function addButton(root, card) {
        root.find('.ns-btn').remove();
        var blocked = isBlocked(card);

        var btn = $('<div class="full-start__button selector ns-btn">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' +
            '<span>' + (blocked ? 'Розблокувати' : 'Ніколи не показувати') + '</span>' +
            '</div>');

        btn.on('hover:enter', function () {
            if (isBlocked(card)) {
                unblock(String(card.id));
                btn.find('span').text('Ніколи не показувати');
            } else {
                block(card);
                btn.find('span').text('Розблокувати');
            }
        });

        root.find('.full-start-new__buttons').append(btn);
    }

    function startPlugin() {
        window.nevershowplugin = true;

        // Кнопка в картці фільму
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'build' && e.name === 'start') {
                var root = e.item && e.item.html ? e.item.html : null;
                var card = e.data && e.data.movie ? e.data.movie : null;
                if (!root || !card) return;
                addButton(root, card);
            }
        });

        // Фільтр пошуку
        Lampa.Listener.follow('search', function (e) {
            if (e.type === 'complite' && e.data && Array.isArray(e.data.results)) {
                e.data.results = filterResults(e.data.results);
            }
        });

        // Фільтр категорій (головна, жанри, популярне)
        Lampa.Listener.follow('category', function (e) {
            if (e.type === 'complite' && e.data && Array.isArray(e.data.results)) {
                e.data.results = filterResults(e.data.results);
            }
        });

        // Фільтр схожих / рекомендацій
        Lampa.Listener.follow('similar', function (e) {
            if (e.type === 'complite' && e.data && Array.isArray(e.data.results)) {
                e.data.results = filterResults(e.data.results);
            }
        });

        // Універсальний фільтр для всіх API запитів
        Lampa.Listener.follow('api', function (e) {
            if (e.type === 'complite' && e.target && e.target.data && Array.isArray(e.target.data.results)) {
                e.target.data.results = filterResults(e.target.data.results);
            }
        });
    }

    // Налаштування
    Lampa.SettingsApi.addComponent({
        component: 'never_show',
        name: '🚫 Приховані фільми',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
    });

    Lampa.SettingsApi.addParam({
        component: 'never_show',
        param: { name: 'never_show_open', type: 'button', default: false },
        field: { name: 'Переглянути список прихованих', description: 'Тут можна розблокувати фільми' },
        onChange: function () { openList(); }
    });

    Lampa.SettingsApi.addParam({
        component: 'never_show',
        param: { name: 'never_show_clear', type: 'button', default: false },
        field: { name: 'Очистити весь список', description: 'Видалити всі приховані фільми' },
        onChange: function () { saveList([]); Lampa.Noty.show('Список очищено'); }
    });

    if (!window.nevershowplugin) {
        if (window.appready) {
            startPlugin();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') startPlugin();
            });
        }
    }

})();
