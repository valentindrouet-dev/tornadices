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

import { h } from './dom.js?v=1.64';
import { store } from './store.js?v=1.64';

const CLE_LISTE = 'profilsReglages';
const CLE_ACTIF = 'profilActif';
// La clé historique des réglages : c'est elle que « Par défaut » manipule, et
// c'est ce qu'un navigateur ouvert de longue date contient déjà.
const CLE_LIBRE = 'variables';
// Ce qu'on a modifié par-dessus un réglage livré avec le jeu, par identifiant.
const CLE_INTEGRES = 'profilsIntegresModifies';

/**
 * Les réglages livrés avec le jeu — écrits dans le code, donc les mêmes pour
 * tout le monde, sans rien à enregistrer ni à partager.
 *
 * « Vichy » est le paquet imprimé de l'auteur : ses quatorze Tornades, et la
 * manche qui se prend d'un seul Abri. Les combinaisons des cartes sont celles
 * du carton — elles sont dans la définition des cartes, pas ici.
 */
export const PROFILS_INTEGRES = [
  {
    id: 'vichy',
    nom: 'Vichy',
    integre: true,
    variables: {
      modeManche: 'immediat',
      // Le paquet imprimé au complet — les quatorze. Le nommer plutôt que de le
      // laisser vide fige ce que Vichy joue : une carte ajoutée au jeu plus tard
      // n'entrera pas dans ce réglage sans qu'on le décide.
      cartesSansPoints: [
        'spChauffe', 'spPaisible', 'spMaladroite', 'spChargee', 'spTricheurs',
        'spF5', 'spCowboy', 'spSiecle', 'spMega', 'spSommeil', 'spFurieuse',
        'spElectrique', 'spVaches', 'spPoules',
      ],
      cartesSansPointsVues: [
        'spChauffe', 'spPaisible', 'spMaladroite', 'spChargee', 'spTricheurs',
        'spF5', 'spCowboy', 'spSiecle', 'spMega', 'spSommeil', 'spFurieuse',
        'spElectrique', 'spVaches', 'spPoules',
      ],
      // Les cartes à réunir pour gagner, effectif par effectif. Plus il y a de
      // monde, plus les manches sont disputées : l'objectif monte avec la table.
      cartesParMode: { immediat: { 3: 4, 4: 5, 5: 5, 6: 5, 7: 6, 8: 6 } },
      // Le Vert joue seul contre deux équipes : il lui en faut beaucoup moins,
      // et l'écart se creuse à mesure que la table grandit. Il n'existe qu'aux
      // effectifs impairs — les lignes paires ne sont jamais lues.
      cartesVertParMode: { immediat: { 3: 2, 5: 3, 7: 4 } },
    },
  },
];

const INTEGRES_PAR_ID = Object.fromEntries(PROFILS_INTEGRES.map((p) => [p.id, p]));

/** Ce qu'on a modifié par-dessus les réglages livrés, par identifiant. */
function modificationsIntegrees() {
  const o = store.get(CLE_INTEGRES, {});
  return o && typeof o === 'object' ? o : {};
}

/** Vrai si ce réglage est livré avec le jeu — il ne se renomme ni ne s'efface. */
export function estIntegre(id) {
  return !!INTEGRES_PAR_ID[id];
}

/** Vrai si un réglage livré a été modifié ici — on peut alors y revenir. */
export function integreModifie(id) {
  return estIntegre(id) && !!modificationsIntegrees()[id];
}

/** Rend un réglage livré tel qu'il est écrit dans le code. */
export function retablirIntegre(id) {
  if (!estIntegre(id)) return;
  const tout = modificationsIntegrees();
  delete tout[id];
  store.set(CLE_INTEGRES, tout);
}

/**
 * Tous les réglages proposés : ceux livrés avec le jeu d'abord, puis les vôtres
 * dans l'ordre où vous les avez créés.
 */
export function profils() {
  const l = store.get(CLE_LISTE, []);
  const miens = Array.isArray(l) ? l.filter((p) => p && typeof p === 'object' && p.id) : [];
  // Un réglage à vous ne peut pas porter l'identifiant d'un réglage livré : le
  // second l'emporterait, et l'on ne saurait plus lequel on modifie.
  return [...PROFILS_INTEGRES, ...miens.filter((p) => !estIntegre(p.id))];
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
  const id = idActif();
  if (!id) return store.get(CLE_LIBRE, {});
  // Un réglage livré avec le jeu se lit dans le code — sauf si on l'a modifié
  // ici, auquel cas c'est notre version qui vaut, jusqu'à ce qu'on la rende.
  if (estIntegre(id)) {
    const mien = modificationsIntegrees()[id];
    if (mien && typeof mien === 'object') return mien;
    return JSON.parse(JSON.stringify(INTEGRES_PAR_ID[id].variables));
  }
  const p = profils().find((x) => x.id === id);
  return p && p.variables && typeof p.variables === 'object' ? p.variables : {};
}

/** Et l'unique écriture, au même endroit que la lecture. */
export function enregistrerReglages(v) {
  const valeur = v && typeof v === 'object' ? v : {};
  const id = idActif();
  if (!id) { store.set(CLE_LIBRE, valeur); return; }
  // Le code ne se réécrit pas : ce qu'on modifie par-dessus un réglage livré
  // est gardé à part, et « Réglage d'origine » l'efface d'un coup.
  if (estIntegre(id)) {
    store.set(CLE_INTEGRES, { ...modificationsIntegrees(), [id]: valeur });
    return;
  }
  const liste = store.get(CLE_LISTE, []);
  const miens = Array.isArray(liste) ? liste : [];
  const p = miens.find((x) => x && x.id === id);
  if (!p) { store.set(CLE_LIBRE, valeur); return; }
  p.variables = valeur;
  store.set(CLE_LISTE, miens);
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
  // Les identifiants et les noms se cherchent parmi tous les réglages proposés,
  // mais l'écriture ne touche que les vôtres : le code ne s'enregistre pas.
  const tous = profils();
  const miens = store.get(CLE_LISTE, []);
  const liste = Array.isArray(miens) ? miens.filter((x) => x && x.id && !estIntegre(x.id)) : [];
  const p = {
    id: nouvelId(tous),
    nom: nomLibre(tous, nom),
    // Copie : le nouveau réglage ne doit pas partager son objet avec l'ancien.
    variables: JSON.parse(JSON.stringify(reglagesCourants() || {})),
  };
  liste.push(p);
  store.set(CLE_LISTE, liste);
  store.set(CLE_ACTIF, p.id);
  return p.id;
}

export function renommerProfil(id, nom) {
  // Un réglage livré avec le jeu porte le nom qu'il a dans le code.
  if (estIntegre(id)) return;
  const miens = store.get(CLE_LISTE, []);
  const liste = Array.isArray(miens) ? miens.filter((x) => x && x.id && !estIntegre(x.id)) : [];
  const p = liste.find((x) => x.id === id);
  if (!p) return;
  p.nom = nomLibre(profils(), nom, id);
  store.set(CLE_LISTE, liste);
}

/**
 * Supprime un réglage. Le supprimer alors qu'il est actif ramène au défaut.
 * Un réglage livré avec le jeu ne s'efface pas : il est dans le code.
 */
export function supprimerProfil(id) {
  if (estIntegre(id)) return;
  const miens = store.get(CLE_LISTE, []);
  const liste = Array.isArray(miens) ? miens : [];
  store.set(CLE_LISTE, liste.filter((p) => p && p.id !== id));
  if (store.get(CLE_ACTIF, null) === id) store.set(CLE_ACTIF, null);
}

/** Sélectionne un réglage — `null` pour « Par défaut ». */
export function selectionnerProfil(id) {
  store.set(CLE_ACTIF, id && profils().some((p) => p.id === id) ? id : null);
}

// ── La barre de sélection ────────────────────────────────────────────────────
// Le même bandeau en haut des Réglages et du Laboratoire : les deux pages lisent
// les mêmes réglages, elles doivent en changer au même endroit.

// Renommer et supprimer sont des gestes rares : ils restent derrière « Éditer »
// plutôt que d'encombrer un bandeau qu'on ne vient lire que pour changer de
// réglage. L'état n'est pas enregistré — le mode se referme au rechargement.
let edition = false;

/**
 * @param {function} apres  appelée après toute modification. Elle redessine la
 *   page — et c'est à elle de reconstruire ce qui dépend des réglages : le
 *   Laboratoire garde sa propre copie de configuration, il doit la refaire.
 */
export function barreProfils(apres) {
  const liste = profils();
  const actif = idActif();
  const courant = profilActif();
  // Rien à éditer sous « Par défaut » : il n'a ni nom propre ni existence à
  // supprimer. Le bouton disparaît plutôt que de s'afficher sans effet.
  // Un réglage livré avec le jeu n'a ni nom à changer ni existence à supprimer :
  // il est dans le code. Il se modifie tout de même, et se rend d'un bouton.
  const livre = !!courant && estIntegre(courant.id);
  const editable = !!courant && !livre;

  const puce = (id, nom) => h('button', {
    class: `chip chip--profil${(id || null) === actif ? ' on' : ''}`
      + (estIntegre(id) ? ' chip--livre' : ''),
    title: id
      ? (estIntegre(id) ? `Passer sur « ${nom} » — un réglage livré avec le jeu` : `Passer sur « ${nom} »`)
      : 'Les réglages libres du site, ceux qu’on modifie hors de tout réglage nommé',
    // On clique une puce pour se servir du réglage, pas pour le renommer : le
    // mode édition se referme, il ne suit pas d'un réglage à l'autre.
    onclick: () => { selectionnerProfil(id); edition = false; apres(); },
  }, nom);

  const supprimer = !editable ? null : (() => {
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
      // Après une suppression on retombe sur « Par défaut », qui n'a rien à
      // éditer : le mode se referme de lui-même.
      edition = false;
      apres();
    };
    return b;
  })();

  return h('div.carte.carte--profils',
    h('div.rangee',
      h('div.titre-section', { style: { margin: 0 } }, 'Réglages enregistrés'),
      h('div.pousse'),
      editable
        ? h('button.btn.btn--petit', {
            title: edition
              ? 'Refermer le renommage et la suppression'
              : `Renommer ou supprimer « ${courant.nom} »`,
            onclick: () => { edition = !edition; apres(); },
          }, edition ? 'Terminé' : 'Éditer')
        : null,
      // Un réglage livré modifié se rend tel qu'il est écrit dans le code.
      livre && integreModifie(courant.id)
        ? h('button.btn.btn--petit', {
            title: `Effacer vos modifications et retrouver « ${courant.nom} » d’origine`,
            onclick: () => { retablirIntegre(courant.id); apres(); },
          }, 'Réglage d’origine')
        : null,
      h('button.btn.btn--petit', {
        title: 'Copier les réglages en cours dans un nouveau réglage, à nommer',
        onclick: () => { creerProfil(`Réglage ${profils().length + 1}`); apres(); },
      }, '+ Nouveau'),
    ),
    h('div.rangee.rangee--serree', { style: { marginTop: '10px' } },
      puce(null, 'Par défaut'),
      ...liste.map((p) => puce(p.id, p.nom)),
    ),
    editable && edition
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
      livre
        ? `« ${courant.nom} » est livré avec le jeu : il est le même pour tout le monde, `
          + 'sans rien à enregistrer ni à partager. Ce que vous modifiez ci-dessous ne vaut '
          + 'que pour ce navigateur, et « Réglage d’origine » le rend tel qu’il est écrit.'
        : courant
          ? `Tout ce que vous modifiez ci-dessous s’enregistre dans « ${courant.nom} », `
          + 'aux Réglages comme au Laboratoire. Les autres réglages ne bougent pas.'
        : 'Les réglages libres du site. Créez-en un nouveau pour garder cette version '
          + 'de côté et en essayer une autre : un clic suffit ensuite pour passer de '
          + 'l’une à l’autre, ici comme au Laboratoire.'),
  );
}
