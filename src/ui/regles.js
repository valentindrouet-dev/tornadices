// Les règles du jeu (V6), telles que le réglage actif les fait jouer : chaque
// valeur qui vient des Réglages est en gras. La page s'imprime.

import { h, remplacer } from './dom.js?v=2.15';
import { store } from './store.js?v=2.15';
import { aller } from './app.js?v=2.15';
import { emblemeEquipe, suiteSymboles, pastilleSymbole } from './icons.js?v=2.15';
import {
  EQUIPES, SYMBOLES, ORDRE_SYMBOLES, CARTES_PAR_ID, NOMBRES_JOUEURS, PROFILS_IA,
  configDepuis, placement, requisCarte, noteCarte, bornerJoueurs,
} from '../core/config.js?v=2.15';
import { MOTS } from '../core/themes.js?v=2.15';
import { reglagesCourants, reglesOfficielles, nomActif } from './profils.js?v=2.15';

const ETATS = { endormi: 'Face endormie', eveille: 'Face réveillée', tous: 'Les deux faces' };
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function vueRegles() {
  const racine = h('div.page.page-regles');
  let nb = bornerJoueurs(store.get('nbJoueurs', 6));

  function dessiner() {
    const r = reglagesCourants();
    const cfg = configDepuis(r, nb);
    const ref = configDepuis(reglesOfficielles().reglages, nb);
    // Une valeur réglée : en gras, et soulignée quand elle n'est pas l'officielle.
    const v = (valeur, officielle = valeur) => h('strong', {
      class: String(valeur) !== String(officielle) ? 'valeur--ecart' : '',
      title: String(valeur) !== String(officielle) ? `Règle officielle : ${officielle}` : null,
    }, String(valeur));
    const sieges = placement(nb);
    const B = EQUIPES.bleu, J = EQUIPES.jaune, V = EQUIPES.vert;
    const impair = nb % 2 === 1;
    const combo = (id) => cfg.combos.find((c) => c.id === id);
    const abri = combo('abri');
    const cartes = cfg.cartes.map((id) => CARTES_PAR_ID[id]);
    const nbFaces = (sym) => cfg.faces.filter((f) => f === sym).length;

    remplacer(racine,
      h('div.rangee.sans-impression', { style: { margin: '6px 0 14px' } },
        h('h1', 'Règles du jeu'),
        h('div.pousse'),
        h('span.petit.muted', 'Joueurs'),
        h('div.segment', ...NOMBRES_JOUEURS.map((n) => h('button', {
          class: n === nb ? 'on' : '', onclick: () => { nb = n; dessiner(); },
        }, String(n)))),
        h('button.btn.btn--petit', { onclick: () => window.print() }, 'Imprimer'),
        h('button.btn.btn--petit', { onclick: () => aller('/reglages') }, 'Réglages'),
      ),
      h('p.petit.muted', { style: { marginBottom: '14px' } },
        `TornaDice, règles V6 — réglage « ${nomActif()} », à ${nb} joueurs. `,
        'Les valeurs en ', h('strong', 'gras'), ' viennent des Réglages',
        ' ; ', h('strong.valeur--ecart', 'soulignées'), ', elles s’écartent des Règles officielles.'),

      h('div.grille.grille--regles',
        h('div.carte',
          h('div.titre-section', 'Mise en place'),
          h('ol.regles-liste',
            h('li', 'Deux équipes de même effectif, les ', h('strong', B.animal), ` (${B.couleur}) et les `, h('strong', J.animal),
              ` (${J.couleur}), assises en alternance.`,
              impair ? [' À ', v(nb), ' joueurs, le ', h('strong', V.un), ` (${V.couleur}) joue seul, entre deux joueurs adverses.`] : null),
            h('li', 'Chacun pose sa Carte Rôle devant lui, ', h('strong', MOTS.faceDepart), '.'),
            h('li', 'On joue avec ', v(pluriel(cfg.lots, 'lot'), pluriel(ref.lots, 'lot')), ' de ', v(cfg.desParLot, ref.desParLot),
              ` dés. Chaque joueur des ${J.animal} en reçoit un`,
              impair ? ` ; le ${V.un} récupère toujours le lot restant en début de manche.` : '.'),
            h('li', 'La pioche est face cachée', cfg.melangerCartes ? ', mélangée' : ', dans l’ordre',
              '. La Tornade de Chauffe ouvre toujours la partie.'),
            h('li', 'Sur la carte Tornade, placez ', v(pluriel(cfg.jetons, 'Jeton'), pluriel(ref.jetons, 'Jeton')), ' par équipe',
              impair && cfg.jetonsVert !== cfg.jetons ? [' et ', v(cfg.jetonsVert, ref.jetonsVert), ` pour le ${V.un}`] : null,
              ` (${[J.jetons, B.jetons, impair ? V.jetons : null].filter(Boolean).join(', ')})`,
              nb === 3 ? ' : deux par joueur à trois.' : ' : autant que de joueurs dans l’équipe.'),
            h('li', 'La Carte Rotation est posée sur une face au hasard : elle donne le sens dans lequel passent les lots.'),
          ),
          h('div.rangee.rangee--serree', { style: { marginTop: '10px' } },
            ...sieges.map((e, i) => h('span.badge', { class: `badge--${e}` }, emblemeEquipe(EQUIPES[e].embleme, 18), ` ${i + 1}`))),
        ),

        h('div.carte',
          h('div.titre-section', 'Une manche'),
          h('p', 'Tout le monde joue ', h('strong', 'en même temps'), '. Le joueur qui tient un lot le lance, puis relance les dés qu’il veut, '
            + 'le plus vite possible, jusqu’à former une combinaison visible sur sa Carte Rôle.'),
          h('ul.regles-liste',
            h('li', 'Un dé qui affiche la ', pastilleSymbole('tornade', 18), ' tornade ne se relance plus.'),
            h('li', 'Une combinaison formée est jouée aussitôt : on ne relance pas ses dés. Puis le lot passe au voisin, dans le sens de la Carte Rotation.'),
            h('li', h('strong', 'Tourbillon'), ' : si le voisin tient déjà un lot en cours, il doit immédiatement passer le sien, et ainsi de suite.'),
          ),
          h('p', 'Une équipe gagne la manche en récupérant son ', h('strong', 'dernier jeton'), ` (combinaison ${abri.nom}) — ou par la `
            + 'combinaison ou l’effet de certaines cartes Tornade. Elle s’empare de la Carte Tornade, et les jetons reviennent sur la suivante.'),
          h('p', 'L’équipe perdante débute la manche suivante avec les lots, et peut retourner la Carte Rotation.',
            impair ? ` Si le ${V.un} gagne, il désigne l’équipe « perdante ».` : ''),
        ),
      ),

      h('div.carte',
        h('div.titre-section', 'Les combinaisons de la Carte Rôle'),
        h('div.grille.grille--combos', ...cfg.combos.map((c, i) => h('div.combo-regle', { class: `combo-regle--${c.couleur}` },
          h('div.rangee.rangee--serree', suiteSymboles(c.requis, 26)),
          h('div',
            h('div', h('strong', c.nom), ' — ', v(Object.entries(c.requis).map(([s, n]) => `${n} ${SYMBOLES[s].nom}`).join(' + '),
              Object.entries(ref.combos[i].requis).map(([s, n]) => `${n} ${SYMBOLES[s].nom}`).join(' + '))),
            h('div.petit', c.id === 'envol'
              ? 'Passez immédiatement votre lot au joueur suivant, sans relancer. S’il tient un lot, vous le forcez à passer aussi.'
              : c.effet),
            h('div.mini.muted', ETATS[c.etat]))))),
        h('p.petit.muted', { style: { marginTop: '10px' } },
          'Le dé : ', ...ORDRE_SYMBOLES.filter((s) => nbFaces(s)).flatMap((s, i, tous) => [
            v(nbFaces(s), ref.faces.filter((f) => f === s).length), ` ${SYMBOLES[s].nom}`, i < tous.length - 1 ? ' · ' : '.'])),
      ),

      h('div.grille.grille--regles',
        h('div.carte',
          h('div.titre-section', 'Fin de partie'),
          h('p', 'La première équipe à gagner ', v(pluriel(cfg.cartesPourGagner, 'Carte'), pluriel(ref.cartesPourGagner, 'Carte')),
            ' Tornade remporte la partie.',
            impair && cfg.cartesVert !== cfg.cartesPourGagner ? [` Le ${V.un} gagne à `, v(cfg.cartesVert, ref.cartesVert), '.'] : null),
          h('p.petit.muted', 'Si la pioche s’épuise avant, l’équipe qui a le plus de cartes l’emporte.'),
          h('div.titre-section', { style: { marginTop: '14px' } }, 'Incidents'),
          h('ul.regles-liste',
            h('li', 'Une erreur (relancer une tornade, par exemple) : passez immédiatement votre lot.'),
            h('li', 'Jeter ses dés en les passant, ou se protéger autrement qu’en passant : l’équipe adverse remporte la manche.'),
            h('li', 'Un dé tombe de la table, un imprévu : on met la manche en pause.'),
          ),
          h('p.mini.muted', 'À l’écran, le site joue les combinaisons d’office et interdit les erreurs : les incidents ne concernent que la table réelle.'),
        ),
        h('div.carte',
          h('div.titre-section', 'Les IA du site'),
          h('table.tbl', h('tbody', ...Object.values(PROFILS_IA).map((p) => h('tr', h('td', h('strong', p.nom)), h('td.petit', p.desc))))),
        ),
      ),

      h('div.carte',
        h('div.titre-section', `Les cartes Tornade — ${cartes.length} dans la pioche`),
        h('div.liste-cartes.liste-cartes--regles', ...cartes.map((c) => {
          const requis = requisCarte(cfg, c);
          const note = noteCarte(c, cfg);
          return h('div.ligne-carte',
            h('span.ligne-carte-nom', c.nom),
            h('span.ligne-carte-texte',
              requis ? [h('span.requis-apercu', suiteSymboles(requis, 18)), ' → '] : null,
              c.texte, note ? h('span.mini.muted', ` — ${note}`) : null));
        })),
        h('p.mini.muted', { style: { marginTop: '8px' } },
          'La combinaison d’une carte est ouverte à tous pendant sa manche, endormi comme réveillé, et passe avant celles de la Carte Rôle.'),
      ),
    );
  }

  dessiner();
  return racine;
}
