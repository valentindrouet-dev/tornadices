// Journal des versions.

import { h } from './dom.js?v=1.12';
import { CHANGELOG, VERSION, BUILD_DATE } from '../version.js?v=1.12';

export function vueVersions() {
  return h('div.page',
    h('div.rangee', { style: { margin: '6px 0 6px' } }, h('h1', 'Historique des versions')),
    h('p.petit.muted', { style: { marginBottom: '22px' } },
      `Version actuelle ${VERSION} — compilée le ${BUILD_DATE}.`),
    ...CHANGELOG.map((v, i) => h('div', { class: `ligne-version${i === 0 ? ' actuelle' : ''}` },
      h('div.tete',
        h('span.num', v.version),
        h('span.petit.muted', v.date),
        i === 0 ? h('span.badge', 'version actuelle') : null,
      ),
      h('ul', ...v.notes.map((n) => h('li', n))),
    )),
  );
}
