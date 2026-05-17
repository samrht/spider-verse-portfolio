import type { BugleArticle } from '../types/bugle'

// In-universe Bugle exclusives. Always pinned alongside real wire-service news
// so the publication still feels like *the* Daily Bugle of the Spider-Verse.
// Tone: Jameson-flavored, conspiratorial, just-this-side-of-libel.
//
// All ten stories use `url` pointing to /bugle so the click-throughs stay
// in-app (real wire stories use their actual url).
const SPIDEY_HOME = '/bugle'

export const spidermanStories: BugleArticle[] = [
  {
    id: 'spidey-001',
    headline: 'SPIDER-MAN: THREAT OR MENACE? J. JONAH JAMESON WEIGHS IN — AGAIN',
    lede:
      'In a 4,000-word editorial dictated between cigar breaks, the publisher renewed his decade-long campaign to "unmask the wall-crawling vigilante before it\'s too late."',
    category: 'politics',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Ben Urich',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-002',
    headline: 'WEB-SHOOTERS UPGRADE: TEEN INVENTOR FILES PATENT FROM HIGH SCHOOL CHEM LAB',
    lede:
      'Anonymous USPTO filing describes a "pneumatic polymer launcher capable of suspending 250kg from a single anchor point." Bugle science desk: "Plausible — but who?"',
    category: 'science',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Phil Urich',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-003',
    headline: 'OSCORP TOWER LIGHTS FLICKER AGAIN — RESIDENTS REPORT "GREEN GLOW"',
    lede:
      'Norman Osborn declined to comment. Building inspectors cite "experimental ventilation." Locals are stocking pumpkin spice and avoiding rooftops.',
    category: 'technology',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Robbie Robertson',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-004',
    headline: 'MIDTOWN HIGH WINS CITY SCIENCE FAIR — JUDGES "BAFFLED" BY WEB-FLUID ENTRY',
    lede:
      'A student team\'s polymer adhesive holds 250x its weight, dissolves in 60 minutes, and "feels weirdly familiar." First prize: a scholarship and 200 follow-up questions from this paper.',
    category: 'science',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Joy Mercado',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-005',
    headline: 'METS GAME DELAYED 17 MINUTES AS "RED-AND-BLUE FIGURE" RESCUES FALLING DRONE',
    lede:
      'Upper-deck phone footage shows a humanoid silhouette intercepting a quadcopter mid-fall and webbing it to the foul pole. The Mets still lost.',
    category: 'sports',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Ned Leeds',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-006',
    headline: 'BROADWAY REVIVAL CANCELS PREVIEWS AFTER REAL SPIDER-MAN APPEARS IN THE RAFTERS',
    lede:
      'Three cast members refused to perform after the actual subject of the musical was spotted in the catwalks during dress rehearsal. Producers cite "creative differences."',
    category: 'entertainment',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Betty Brant',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-007',
    headline: 'CITY COUNCIL VOTES 4–3 TO STUDY "SUPERHERO LIABILITY INSURANCE" — BUGLE OPPOSES',
    lede:
      'Proposed ordinance would require masked vigilantes to register a billing address. Civil-liberties groups call it "unworkable." Jameson calls it "the bare minimum."',
    category: 'politics',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Glory Grant',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-008',
    headline: 'STARK INDUSTRIES UNVEILS "ARACHNID-CLASS" DRONE — DENIES SPIDER-MAN INSPIRATION',
    lede:
      'Eight-legged surveillance unit can scale 90° surfaces and "subdue civilian threats with non-lethal restraint webbing." Stark spokesperson: "Pure coincidence."',
    category: 'technology',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Ben Urich',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-009',
    headline: 'QUEENS BODEGA OWNER NAMES NEW SANDWICH "THE WALL-CRAWLER" — BUGLE DEMANDS RETRACTION',
    lede:
      'Mr. Delmar\'s $6.50 Cuban-style hero is "selling faster than F-train delays." Jameson: "We will not allow our city\'s menus to be co-opted by masked criminals."',
    category: 'entertainment',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Robbie Robertson',
    isSpiderManStory: true,
  },
  {
    id: 'spidey-010',
    headline: 'KNICKS FORWARD CREDITS "ANONYMOUS WEB-SLINGER" FOR ASSIST IN GAME 7',
    lede:
      'A loose ball, a webline, a fast break. The league office is "reviewing footage." The Bugle is reviewing the sports desk\'s sobriety.',
    category: 'sports',
    source: 'Daily Bugle',
    url: SPIDEY_HOME,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    reporter: 'Joy Mercado',
    isSpiderManStory: true,
  },
]

export function getRandomSpiderManStory(): BugleArticle {
  return spidermanStories[Math.floor(Math.random() * spidermanStories.length)]
}
