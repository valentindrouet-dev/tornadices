// Journal des versions. Il est long : on ne le charge qu'ici.

import { h, remplacer } from './dom.js?v=2.01';
import { VERSION, BUILD_DATE } from '../version.js?v=2.01';

export function vueVersions() {
  const liste = h('div', h('p.muted', 'Chargement du journal…'));
  import('../journal.js?v=2.01').then(({ CHANGELOG }) => remplacer(liste,
    ...CHANGELOG.map((v, i) => h('div', { class: `ligne-version${i === 0 ? ' actuelle' : ''}` },
      h('div.tete',
        h('span.num', v.version),
        h('span.petit.muted', v.date),
        i === 0 ? h('span.badge', 'version actuelle') : null,
      ),
      h('ul', ...v.notes.map((n) => h('li', n))),
    ))));
  return h('div.page',
    h('div.rangee', { style: { margin: '6px 0 6px' } }, h('h1', 'Historique des versions')),
    h('p.petit.muted', { style: { marginBottom: '22px' } }, `Version actuelle ${VERSION} — compilée le ${BUILD_DATE}.`),
    liste,
  );
}
