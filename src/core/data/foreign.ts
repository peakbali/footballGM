/**
 * Foreign player pools (DESIGN 3.1): clubs abroad exist only as squads in the transfer
 * database. No fixtures are simulated for them. All clubs are fictional; each league is a generic top flight of that country.
 * Each club line is "Name:quality" where quality shifts the squad level around the league average.
 */
export interface ForeignLeague {
  key: string;
  country: string; // ISO alpha-3, also the main nationality of the squads
  name: string;
  avg: number; // average OVR of a typical first XI on the game's 1-100 scale
  suffix: [string, string]; // stadium name pattern: prefix, postfix
  clubs: string;
}

export const FOREIGN: ForeignLeague[] = [
  {
    key: 'ESP1', country: 'ESP', name: 'Spanish League', avg: 76, suffix: ['Estadio ', ''],
    clubs: 'CD Miramar:8;Real Riberafuerte:8;Cerromar CF:5;UD Albasol:3;SD Castelrosa:3;Deportivo Sierrarosa:2;Racing Benafuerte:2;CD Torrealta:0;Real Moncillo:1;Torrereda CF:0;UD Riberasol:0;SD Valmar:0;Deportivo Cerrosol:-1;Racing Peñablanca:-1;CD Alcareda:-1;Real Miracillo:-1;Sierraverde CF:-2;UD Castelblanca:-3;SD Loralta:-3;Deportivo Sierramar:-4',
  },
  {
    key: 'GER1', country: 'GER', name: 'German League', avg: 75, suffix: ['', ' Arena'],
    clubs: 'Eintracht Lindorf:9;SV Altenbach:4;FC Altendorf:4;VfL Rosenau:3;SC Weisstadt:3;TSV Hohenbach:2;Sportfreunde Eisenburg:1;Eintracht Linburg:0;SV Linhof:0;FC Steinhof:0;VfL Neudorf:0;SC Hohenhof:0;TSV Lindenburg:-1;Sportfreunde Waldbach:-1;Eintracht Hohental:-2;SV Rosenbach:-3;FC Waldbrück:-2;VfL Kirchberg:-2',
  },
  {
    key: 'ITA1', country: 'ITA', name: 'Italian League', avg: 75, suffix: ['Stadio ', ''],
    clubs: 'Castelvento Calcio:6;SS Vernera:5;Virtus Valvento:4;Sporting Cambello:4;AC Salgano:4;US Beltura:3;Camlina Calcio:2;SS Fiorchio:2;Virtus Vermare:1;Sporting Fiortura:1;AC Monlina:0;US Roccatura:-1;Verlina Calcio:-1;SS Lagomare:-2;Virtus Fiorverde:-2;Sporting Valtura:-3;AC Sorbello:-2;US Cammare:-2;Pietrafiore Calcio:-3;SS Monfiore:-3',
  },
  {
    key: 'FRA1', country: 'FRA', name: 'French League', avg: 73, suffix: ['Stade ', ''],
    clubs: 'Stade Lanpierre:10;RC Langny:4;US Fontgny:4;Racing Valbourg:3;SC Valnoir:3;FC Clairchamp:1;AS Beaumer:1;Stade Rocherive:1;RC Beauville:1;US Lanbourg:-1;Racing Lanchamp:-1;SC Gronnoir:-2;FC Valmer:-2;AS Préchamp:-3;Stade Fontville:-3;RC Fontchamp:-3;US Fontlac:-3;Racing Gronmont:-4',
  },
  {
    key: 'POR1', country: 'POR', name: 'Portuguese League', avg: 69, suffix: ['Estádio ', ''],
    clubs: 'Desportivo Fontefiel:8;SC Ribeibrava:8;CD Barrolinhos:8;Valelhão FC:4;União Penavela:1;Académico Ribeigal:0;GD Lousavela:0;Desportivo Alvalhão:-1;SC Serranova:-1;CD Lousalhão:-1;Covamar FC:-1;União Valelinhos:-1;Académico Covarinha:-2;GD Miralinhos:-2;Desportivo Valegal:-2;SC Serrabrava:-3;CD Fontemar:-3;Fontevela FC:-3',
  },
  {
    key: 'NED1', country: 'NED', name: 'Dutch League', avg: 68, suffix: ['', ' Stadion'],
    clubs: 'Sportclub Langehorst:9;Quick Zuiderhoven:8;VV Hoogberg:8;SC Molenland:5;FC Dijkhoven:3;Waterwijk Boys:3;Sportclub Groendrecht:0;Quick Noordhorst:0;VV Waterhoven:-1;SC Brugloo:-1;FC Groenwijk:-1;Noorddrecht Boys:-2;Sportclub Zuiderhorst:-2;Quick Brugveen:-2;VV Westberg:-2;SC Zanddam:-3;FC Waterberg:-3;Groenveen Boys:-4',
  },
  {
    key: 'SCO1', country: 'SCO', name: 'Scottish League', avg: 60, suffix: ['', ' Park'],
    clubs: 'Balgowrie Thistle:12;Dalleven FC:10;Strathlyon Athletic:3;Torcarron Rovers:3;Auchmuir United:3;Glengowrie Academicals:1;Glenleven Albion:0;Glenhaven Thistle:0;Torgowrie FC:-1;Inverhaven Athletic:-1;Kinmuir Rovers:-2;Auchmore United:-2',
  },
];

export const FOREIGN_COLORS: Record<string, [string, string]> = {
  'CD Miramar': ['#ffffff', '#1d2a6b'], 'Real Riberafuerte': ['#a50044', '#004d98'], 'Cerromar CF': ['#cb3524', '#ffffff'],
  'Eintracht Lindorf': ['#dc052d', '#ffffff'], 'FC Altendorf': ['#fde100', '#000000'], 'SV Altenbach': ['#e32221', '#000000'],
  'Castelvento Calcio': ['#0068a8', '#000000'], 'Virtus Valvento': ['#ffffff', '#000000'], 'Sporting Cambello': ['#fb090b', '#000000'], 'SS Vernera': ['#12a0d7', '#ffffff'],
  'Stade Lanpierre': ['#004170', '#da291c'], 'RC Langny': ['#2faee0', '#ffffff'],
  'Desportivo Fontefiel': ['#e83030', '#ffffff'], 'SC Ribeibrava': ['#1e3a8a', '#ffffff'], 'CD Barrolinhos': ['#008057', '#ffffff'],
  'Sportclub Langehorst': ['#ed1c24', '#ffffff'], 'Quick Zuiderhoven': ['#d2122e', '#ffffff'], 'VV Hoogberg': ['#e30613', '#ffffff'],
  'Balgowrie Thistle': ['#018749', '#ffffff'], 'Dalleven FC': ['#1b458f', '#ffffff'],
};
