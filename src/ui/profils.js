// Réglages enregistrés : des jeux de réglages nommés, qu'on applique d'un clic.
//
// Équilibrer un jeu, c'est comparer des versions entre elles. Jusqu'ici il n'y
// avait qu'un seul jeu de réglages : essayer autre chose voulait dire tout
// remodifier à la main, puis tout remettre pour retrouver la version d'avant.
//
// Un réglage enregistré porte simplement les réglages de la page Réglages —
// l'objet partiel posé par-dessus les défauts du nombre de joueurs. Rien n'y est
// figé : sélectionnez-le, et tout ce que vous modifiez ensuite s'y enregistre.
//
// « Par défaut » n'est pas un enregistrement mais l'absence d'enregistrement :
// les réglages libres, ceux du site depuis toujours, sous leur clé historique.
// Le sélectionner les retrouve tels qu'on les avait laissés — il n'efface rien.

import { h } from './dom.js?v=1.44';
import { store } from './store.js?v=1.44';

const CLE_LISTE = 'profilsReglages';
const CLE_ACTIF = 'profilActif';
// La clé historique des réglages : c'est elle que « Par défaut » manipule, et
// c'est ce qu'un navigateur ouvert de longue date contient déjà.
const CLE_LIBRE = 'variables';

/** Tous les réglages enregistrés, dans l'ordre où ils ont été créés. */
export function profils() {
  const l = store.get(CLE_LISTE, []);
  if (!Array.isArray(l)) return [];
  return l.filter((p) => p && typeof p === 'object' && p.id);
}

/** L'identifiant du réglage sélectionné, ou `null` pour « Par défaut ». */
export function idActif() {
  const id = store.get(CLE_ACTIF, null);
  if (!id) return null;
  // Un réglage supprimé dans un autre onglet ne doit pas laisser la page
  // pointer dans le vide : on retombe sur « Par défaut ».
  return profils().some((p) => p.id === id) ? id : null;
}

/** Le réglage sélectionné, ou `null` sous « Par défaut ». */
export function profilActif() {
  const id = idActif();
  return id ? profils().find((p) => p.id === id) || null : null;
}

/** Son nom, « Par défaut » compris — de quoi l'écrire dans une phrase. */
export function nomActif() {
  const p = profilActif();
  return p ? p.nom : 'Par défaut';
}

/**
 * Les réglages en vigueur. C'est l'unique lecture : selon la sélection, ils
 * viennent du réglage enregistré ou de la clé libre, et le reste du site n'a
 * pas à savoir lequel des deux.
 */
export function reglagesCourants() {
  const p = profilActif();
  if (!p) return store.get(CLE_LIBRE, {});
  return p.variables && typeof p.variables === 'object' ? p.variables : {};
}

/** Et l'unique écriture, au même endroit que la lecture. */
export function enregistrerReglages(v) {
  const valeur = v && typeof v === 'object' ? v : {};
  const id = idActif();
  if (!id) { store.set(CLE_LIBRE, valeur); return; }
  const liste = profils();
  const p = liste.find((x) => x.id === id);
  if (!p) { store.set(CLE_LIBRE, valeur); return; }
  p.variables = valeur;
  store.set(CLE_LISTE, liste);
}

/**
 * Un identifiant qui ne dépend d'aucune horloge ni d'aucun hasard partagé avec
 * le jeu : le compteur suffit, les réglages ne se comparent jamais d'un
 * navigateur à l'autre.
 */
function nouvelId(liste) {
  let n = 1;
  while (liste.some((p) => p.id === `r${n}`)) n++;
  return `r${n}`;
}

/** Un nom libre, mais jamais vide et jamais deux fois le même. */
function nomLibre(liste, souhaite, sauf = null) {
  const base = String(souhaite || '').trim() || 'Sans titre';
  const pris = (nom) => liste.some((p) => p.id !== sauf && p.nom === nom);
  if (!pris(base)) return base;
  let n = 2;
  while (pris(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/**
 * Crée un réglage à partir des réglages en vigueur — on part toujours de ce
 * qu'on a sous les yeux — et le sélectionne. Rend son identifiant.
 */
export function creerProfil(nom) {
  const liste = profils();
  const p = {
    id: nouvelId(liste),
    nom: nomLibre(liste, nom),
    // Copie : le nouveau réglage ne doit pas partager son objet avec l'ancien.
    variables: JSON.parse(JSON.stringify(reglagesCourants() || {})),
  };
  liste.push(p);
  store.set(CLE_LISTE, liste);
  store.set(CLE_ACTIF, p.id);
  return p.id;
}

export function renommerProfil(id, nom) {
  const liste = profils();
  const p = liste.find((x) => x.id === id);
  if (!p) return;
  p.nom = nomLibre(liste, nom, id);
  store.set(CLE_LISTE, liste);
}

/** Supprime un réglage. Le supprimer alors qu'il est actif ramène au défaut. */
export function supprimerProfil(id) {
  store.set(CLE_LISTE, profils().filter((p) => p.id !== id));
  if (store.get(CLE_ACTIF, null) === id) store.set(CLE_ACTIF, null);
}

/** Sélectionne un réglage — `null` pour « Par défaut ». */
export function selectionnerProfil(id) {
  store.set(CLE_ACTIF, id && profils().some((p) => p.id === id) ? id : null);
}

// ── La barre de sélection ────────────────────────────────────────────────────
// Le même bandeau en haut des Réglages et du Laboratoire : les deux pages lisent
// les mêmes réglages, elles doivent en changer au même endroit.

/**
 * @param {function} apres  appelée après toute modification. Elle redessine la
 *   page — et c'est à elle de reconstruire ce qui dépend des réglages : le
 *   Laboratoire garde sa propre copie de configuration, il doit la refaire.
 */
export function barreProfils(apres) {
  const liste = profils();
  const actif = idActif();
  const courant = profilActif();

  const puce = (id, nom) => h('button', {
    class: `chip chip--profil${(id || null) === actif ? ' on' : ''}`,
    title: id ? `Passer sur « ${nom} »` : 'Les réglages libres du site, ceux qu’on modifie hors de tout réglage nommé',
    onclick: () => { selectionnerProfil(id); apres(); },
  }, nom);

  const supprimer = (() => {
    const b = h('button.btn.btn--petit.btn--danger', 'Supprimer');
    let arme = false;
    const desarmer = () => { arme = false; b.textContent = 'Supprimer'; b.classList.remove('btn--arme'); };
    b.onclick = () => {
      if (!arme) {
        arme = true;
        b.textContent = 'Supprimer ?';
        b.classList.add('btn--arme');
        setTimeout(desarmer, 4000);
        return;
      }
      supprimerProfil(courant.id);
      apres();
    };
    return b;
  })();

  return h('div.carte.carte--profils',
    h('div.rangee',
      h('div.titre-section', { style: { margin: 0 } }, 'Réglages enregistrés'),
      h('div.pousse'),
      h('button.btn.btn--petit', {
        title: 'Copier les réglages en cours dans un nouveau réglage, à nommer',
        onclick: () => { creerProfil(`Réglage ${profils().length + 1}`); apres(); },
      }, '+ Nouveau'),
    ),
    h('div.rangee.rangee--serree', { style: { marginTop: '10px' } },
      puce(null, 'Par défaut'),
      ...liste.map((p) => puce(p.id, p.nom)),
    ),
    courant
      ? h('div.rangee', { style: { marginTop: '10px' } },
          h('label.champ', { style: { flex: '1 1 220px' } }, 'Nom',
            h('input', {
              type: 'text', value: courant.nom,
              onchange: (e) => { renommerProfil(courant.id, e.target.value); apres(); },
            })),
          supprimer,
        )
      : null,
    h('p.mini.muted', { style: { marginTop: '10px' } },
      courant
        ? `Tout ce que vous modifiez ci-dessous s’enregistre dans « ${courant.nom} », `
          + 'aux Réglages comme au Laboratoire. Les autres réglages ne bougent pas.'
        : 'Les réglages libres du site. Créez-en un nouveau pour garder cette version '
          + 'de côté et en essayer une autre : un clic suffit ensuite pour passer de '
          + 'l’une à l’autre, ici comme au Laboratoire.'),
  );
}
