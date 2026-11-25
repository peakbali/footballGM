/** Real foreign clubs and kits for the web version only (DESIGN 13.2y; not in the Google Play build). */
import type { ForeignLeague } from './foreign';

export const REAL_FOREIGN: ForeignLeague[] = [
  {
    key: 'ESP1', country: 'ESP', name: 'LaLiga', avg: 76, suffix: ['Estadio ', ''],
    clubs: 'Real Madrid:8;Barcelona:8;Atlético Madrid:5;Athletic Club:3;Villarreal:3;Real Betis:2;Real Sociedad:2;Celta Vigo:0;Sevilla:1;Valencia:0;Girona:0;Osasuna:0;Rayo Vallecano:-1;Espanyol:-1;Getafe:-1;Mallorca:-1;Alavés:-2;Levante:-3;Elche:-3;Real Oviedo:-4',
  },
  {
    key: 'GER1', country: 'GER', name: 'Bundesliga', avg: 75, suffix: ['', ' Arena'],
    clubs: 'Bayern Munich:9;Bayer Leverkusen:4;Borussia Dortmund:4;RB Leipzig:3;Eintracht Frankfurt:3;VfB Stuttgart:2;SC Freiburg:1;Mainz 05:0;Werder Bremen:0;Borussia Mönchengladbach:0;VfL Wolfsburg:0;TSG Hoffenheim:0;FC Augsburg:-1;Union Berlin:-1;St. Pauli:-2;1. FC Heidenheim:-3;1. FC Köln:-2;Hamburger SV:-2',
  },
  {
    key: 'ITA1', country: 'ITA', name: 'Serie A', avg: 75, suffix: ['Stadio ', ''],
    clubs: 'Inter:6;Napoli:5;Juventus:4;AC Milan:4;Atalanta:4;Roma:3;Lazio:2;Bologna:2;Fiorentina:1;Como:1;Torino:0;Udinese:-1;Genoa:-1;Cagliari:-2;Hellas Verona:-2;Lecce:-3;Parma:-2;Sassuolo:-2;Pisa:-3;Cremonese:-3',
  },
  {
    key: 'FRA1', country: 'FRA', name: 'Ligue 1', avg: 73, suffix: ['Stade ', ''],
    clubs: 'Paris Saint-Germain:10;Marseille:4;Monaco:4;Lille:3;Lyon:3;Nice:1;Lens:1;Rennes:1;Strasbourg:1;Brest:-1;Toulouse:-1;Nantes:-2;Auxerre:-2;Angers:-3;Le Havre:-3;Lorient:-3;Paris FC:-3;Metz:-4',
  },
  {
    key: 'POR1', country: 'POR', name: 'Liga Portugal', avg: 69, suffix: ['Estádio ', ''],
    clubs: 'Benfica:8;Porto:8;Sporting CP:8;Braga:4;Vitória de Guimarães:1;Santa Clara:0;Famalicão:0;Casa Pia:-1;Estoril:-1;Moreirense:-1;Rio Ave:-1;Gil Vicente:-1;Arouca:-2;Nacional:-2;Estrela Amadora:-2;AVS:-3;Tondela:-3;Alverca:-3',
  },
  {
    key: 'NED1', country: 'NED', name: 'Eredivisie', avg: 68, suffix: ['', ' Stadion'],
    clubs: 'PSV:9;Ajax:8;Feyenoord:8;AZ:5;Twente:3;Utrecht:3;Go Ahead Eagles:0;NEC:0;Heerenveen:-1;Sparta Rotterdam:-1;Groningen:-1;Fortuna Sittard:-2;PEC Zwolle:-2;Heracles:-2;NAC Breda:-2;Excelsior:-3;Volendam:-3;Telstar:-4',
  },
  {
    key: 'SCO1', country: 'SCO', name: 'Scottish Premiership', avg: 60, suffix: ['', ' Park'],
    clubs: 'Celtic:12;Rangers:10;Hearts:3;Aberdeen:3;Hibernian:3;Dundee United:1;Motherwell:0;St Mirren:0;Kilmarnock:-1;Dundee:-1;Falkirk:-2;Livingston:-2',
  },
];

export const REAL_FOREIGN_COLORS: Record<string, [string, string]> = {
  'Real Madrid': ['#ffffff', '#1d2a6b'], Barcelona: ['#a50044', '#004d98'], 'Atlético Madrid': ['#cb3524', '#ffffff'],
  'Bayern Munich': ['#dc052d', '#ffffff'], 'Borussia Dortmund': ['#fde100', '#000000'], 'Bayer Leverkusen': ['#e32221', '#000000'],
  Inter: ['#0068a8', '#000000'], Juventus: ['#ffffff', '#000000'], 'AC Milan': ['#fb090b', '#000000'], Napoli: ['#12a0d7', '#ffffff'],
  'Paris Saint-Germain': ['#004170', '#da291c'], Marseille: ['#2faee0', '#ffffff'],
  Benfica: ['#e83030', '#ffffff'], Porto: ['#1e3a8a', '#ffffff'], 'Sporting CP': ['#008057', '#ffffff'],
  PSV: ['#ed1c24', '#ffffff'], Ajax: ['#d2122e', '#ffffff'], Feyenoord: ['#e30613', '#ffffff'],
  Celtic: ['#018749', '#ffffff'], Rangers: ['#1b458f', '#ffffff'],
};
