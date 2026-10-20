/* Assemble the game: the core class plus the UI and net/save mixins, then start it. */
(function (K) {
    'use strict';
    K.installMixin(K.Game, K.UI);
    K.installMixin(K.Game, K.Net);
    window.addEventListener('DOMContentLoaded', () => {
        const game = new K.Game();
        game.init();
        window.game = game;     // handy in the console; the game never reads it back
    });
})(window.KOE = window.KOE || {});
