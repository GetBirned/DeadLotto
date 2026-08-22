// Hero asset registry.
//
// The three source asset drops (heroIcons / heroBackgrounds / heroNames) each use a
// different, inconsistent naming scheme for the same 38 heroes (typos, old dev
// codenames, etc). This file is the single place that reconciles them against the
// canonical 38-hero roster shown in the instructions doc's reference image.
//
// Two heroes (Graves, Venator) only exist under old internal codenames in the
// heroNames/heroBackgrounds drops ("necro" and "priest" respectively) - inferred by
// process of elimination plus thematic fit (necro/death <-> Graves, priest/hooded
// figure <-> Venator's robed portrait). Five hero backgrounds also came from files
// named with old codenames instead of hero names and were matched by visual theme:
//   familiar -> Celeste (moon/city art)      [high confidence]
//   unicorn  -> Apollo (mythic horse art)    [medium-high confidence]
//   astro    -> Paige (occult sigil art)     [medium confidence]
//   patience -> Holliday (carnival art)      [medium confidence]
//   fencer   -> Rem (horned/hellish art)     [medium confidence]
// If any of these look wrong in-app, fix the single line below - nothing else
// references file names directly.

export interface HeroDefinition {
  slug: string
  name: string
  icon: string
  cardArt: string
  background: string
  nameSvg: string
  nameSvgLocalized: string
}

const ICONS = '/assets/heroIcons'
const BACKGROUNDS = '/assets/heroBackgrounds'
const NAMES = '/assets/heroNames'

function hero(
  slug: string,
  name: string,
  iconFile: string,
  cardFile: string,
  bgFile: string,
  nameFile: string,
): HeroDefinition {
  return {
    slug,
    name,
    icon: `${ICONS}/${iconFile}`,
    cardArt: `${ICONS}/${cardFile}`,
    background: `${BACKGROUNDS}/${bgFile}`,
    nameSvg: `${NAMES}/${nameFile}.svg`,
    nameSvgLocalized: `${NAMES}/${nameFile}_localized.svg`,
  }
}

export const HEROES: HeroDefinition[] = [
  hero('abrams', 'Abrams', 'abrahams_sm_psd.png', 'abrahms_gloat_psd.png', 'abrams_bg_psd.png', 'abrams'),
  hero('apollo', 'Apollo', 'apollo_sm_psd.png', 'apollo_card_gloat_psd.png', 'unicorn_bg_psd.png', 'apollo'),
  hero('bebop', 'Bebop', 'bebop_sm_psd.png', 'bebop_card_gloat_psd.png', 'bebop_bg_psd.png', 'bebop'),
  hero('billy', 'Billy', 'billy_sm_psd.png', 'billy_card_gloat_psd.png', 'billy_bg_psd.png', 'billy'),
  hero('calico', 'Calico', 'calico_sm_psd.png', 'calico_card_gloat_psd.png', 'calico_bg_psd.png', 'calico'),
  hero('celeste', 'Celeste', 'celeste_sm_psd.png', 'celeste_card_gloat_psd.png', 'familiar_bg_psd.png', 'celeste'),
  hero('doorman', 'The Doorman', 'doorman_sm_psd.png', 'doorman_card_gloat_psd.png', 'doorman_bg_psd.png', 'doorman'),
  hero('drifter', 'Drifter', 'drifter_sm_psd.png', 'drifter_card_gloat_psd.png', 'drifter_bg_psd.png', 'drifter'),
  hero('dynamo', 'Dynamo', 'dynamo_sm_psd.png', 'dynamo_card_gloat_psd.png', 'dynamo_bg_psd.png', 'dynamo'),
  hero('graves', 'Graves', 'graves_sm_psd.png', 'graves_card_gloat_psd.png', 'necro_bg_psd.png', 'necro'),
  hero('grey_talon', 'Grey Talon', 'talon_sm_psd.png', 'talon_card_gloat_psd.png', 'grey_talon_bg_psd.png', 'grey_talon'),
  hero('haze', 'Haze', 'haze_sm_psd.png', 'haze_card_gloat_psd.png', 'haze_bg_psd.png', 'haze'),
  hero('holliday', 'Holliday', 'holliday_sm_psd.png', 'holliday_gloat_psd.png', 'patience_bg_psd.png', 'holliday'),
  hero('infernus', 'Infernus', 'infernus_sm_psd.png', 'infernus_card_gloat_psd.png', 'infernus_bg_psd.png', 'infernus'),
  hero('ivy', 'Ivy', 'ivy_sm_psd.png', 'ivy_card_gloat_psd.png', 'ivy_bg_psd.png', 'ivy'),
  hero('kelvin', 'Kelvin', 'kelvin_sm_psd.png', 'kelvin_card_gloat_psd.png', 'kelvin_bg_psd.png', 'kelvin'),
  hero('lady_geist', 'Lady Geist', 'ladygeist_sm_psd.png', 'ladygeist_card_gloat_psd.png', 'geist_bg_psd.png', 'lady_geist'),
  hero('lash', 'Lash', 'lash_sm_psd.png', 'lash_card_gloat_psd.png', 'lash_bg_psd.png', 'lash'),
  hero('mcginnis', 'McGinnis', 'mcginnis_sm_psd.png', 'mcginnis_card_gloat_psd.png', 'mcginnis_bg_psd.png', 'mcginnis'),
  hero('mina', 'Mina', 'mina_sm_psd.png', 'mina_card_gloat_psd.png', 'mina_bg_psd.png', 'mina'),
  hero('mirage', 'Mirage', 'mirage_sm_psd.png', 'mirage_card_gloat_psd.png', 'mirage_bg_psd.png', 'mirage'),
  hero('mo_krill', 'Mo & Krill', 'mokrill_sm_psd.png', 'mokrill_gloat_psd.png', 'krill_bg_psd.png', 'mo_krill'),
  hero('paige', 'Paige', 'paige_sm_psd.png', 'paige_card_gloat_psd.png', 'astro_bg_psd.png', 'paige'),
  hero('paradox', 'Paradox', 'paradox_sm_psd.png', 'paradox_gloat_psd.png', 'paradox_bg_psd.png', 'paradox'),
  hero('pocket', 'Pocket', 'pocket_sm_psd.png', 'pocket_card_gloat_psd.png', 'pocket_bg_psd.png', 'pocket'),
  hero('rem', 'Rem', 'rem_sm_psd.png', 'rem_card_gloat_psd.png', 'fencer_bg_psd.png', 'rem'),
  hero('seven', 'Seven', 'seven_sm_psd.png', 'seven_card_gloat_psd.png', 'seven_bg_psd.png', 'seven'),
  hero('shiv', 'Shiv', 'shiv_sm_psd.png', 'shiv_card_gloat_psd.png', 'shiv_bg_psd.png', 'shiv'),
  hero('silver', 'Silver', 'silver_sm_psd.png', 'silver_card_gloat_psd.png', 'silver_bg_psd.png', 'silver'),
  hero('sinclair', 'Sinclair', 'sinclair_sm_psd.png', 'sinclair_card_gloat_psd.png', 'sinclair_bg_psd.png', 'sinclair'),
  hero('venator', 'Venator', 'venator_sm_psd.png', 'venator_card_gloat_psd.png', 'priest_bg_psd.png', 'priest'),
  hero('victor', 'Victor', 'victor_sm_psd.png', 'victor_gloat_psd.png', 'victor_bg_psd.png', 'victor'),
  hero('vindicta', 'Vindicta', 'vindicta_sm_png.png', 'vindicta_card_gloat_psd.png', 'vindicta_bg_psd.png', 'vindicta'),
  hero('viscous', 'Viscous', 'viscous_sm_psd.png', 'viscous_card_gloat_psd.png', 'viscous_bg_psd.png', 'viscous'),
  hero('vyper', 'Vyper', 'viper_sm_psd.png', 'viper_card_gloat_psd.png', 'vyper_bg_psd.png', 'vyper'),
  hero('warden', 'Warden', 'warden_sm_psd.png', 'warden_card_gloat_psd.png', 'warden_bg_psd.png', 'warden'),
  hero('wraith', 'Wraith', 'wraith_sm_psd.png', 'wraith_card_gloat_psd.png', 'wraith_bg_psd.png', 'wraith'),
  hero('yamato', 'Yamato', 'yamato_sm_psd.png', 'yamato_card_gloat_psd.png', 'yamato_bg_psd.png', 'yamato'),
]

// The wildcard "your choice" wheel slot - the green slice in the reference wheel image.
export const WILDCARD_SLUG = 'your_choice'

export const WILDCARD_HERO: HeroDefinition = {
  slug: WILDCARD_SLUG,
  name: 'Your Choice',
  icon: `${ICONS.replace('heroIcons', 'branding')}/deadLotto_logo.png`,
  cardArt: `${ICONS.replace('heroIcons', 'branding')}/deadLotto_logo.png`,
  background: `${BACKGROUNDS}/generic_bg_psd.png`,
  nameSvg: '',
  nameSvgLocalized: '',
}

// 39 wheel slots: 38 heroes + 1 wildcard, matching the doc's roulette wheel.
export const WHEEL_SLOTS: HeroDefinition[] = [...HEROES, WILDCARD_HERO]

export const HERO_BY_SLUG: Record<string, HeroDefinition> = Object.fromEntries(
  WHEEL_SLOTS.map((h) => [h.slug, h]),
)

export function getHero(slug: string): HeroDefinition {
  const found = HERO_BY_SLUG[slug]
  if (!found) throw new Error(`Unknown hero slug: ${slug}`)
  return found
}

export function rollRandomHero(): HeroDefinition {
  const idx = Math.floor(Math.random() * WHEEL_SLOTS.length)
  return WHEEL_SLOTS[idx]
}
