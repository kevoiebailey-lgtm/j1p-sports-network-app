import { parseVideoUrl, VideoType } from './videoEmbedUtils';

export interface VideoComment {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
  likes: number;
}

export interface CsvVideoItem {
  id: string;
  title: string;
  videoUrl: string;
  description: string;
  thumbnailImage?: string;
  ratingScore: number;
  viewCount: number;
  uploadDate: string;
  videoType: VideoType;
  embedUrl: string;
  platformName: string;
  likesCount: number;
  comments: VideoComment[];
  category?: string;
}

const RAW_CSV_ITEMS = [
  {
    title: "wo . nola td 1",
    videoUrl: "https://vimeo.com/1186569502?share=copy&fl=sv&fe=ci",
    description: "Touchdown highlight clip from West Orange vs NOLA championship series.",
    ratingScore: 8,
    viewCount: 1250,
    uploadDate: "2026-07-26T21:32:43Z",
    id: "044f71b2-31f5-491e-b289-e264de806805",
    category: "Flag Football"
  },
  {
    title: "New Jersey Elite versus Florida elite [ 2026 Youth Flag Football Championship: Girls 17U Final ]",
    videoUrl: "https://youtu.be/3B52fcgv7Hs?si=mSKPF3aZyqn8mLa7",
    description: "2026 Youth Flag Football Championship: Girls 17U Final showdown featuring top national recruits.",
    ratingScore: 9.5,
    viewCount: 14200,
    uploadDate: "2026-07-17T00:54:35Z",
    id: "0574e1ab-406b-4b48-833a-9c72579aaeb5",
    category: "Flag Football"
  },
  {
    title: "central vs weequahic",
    videoUrl: "https://vimeo.com/1190343868?share=copy&fl=sv&fe=ci",
    description: "High intensity rivalry match: Central High School vs Weequahic High School.",
    ratingScore: 7,
    viewCount: 35000,
    uploadDate: "2026-07-01T01:17:08Z",
    id: "0733a948-4268-4b00-838c-f6454e72bb16",
    category: "Football"
  },
  {
    title: "NJSYFL HL 2026 C 1",
    videoUrl: "https://youtu.be/Vdk1eYQM0i4?si=vjb9IQKA8jch6I60",
    description: "New Jersey Scholastic Youth Football League 2026 Championship Highlights.",
    ratingScore: 8.2,
    viewCount: 2800,
    uploadDate: "2026-07-03T02:45:23Z",
    id: "0a93e062-e81a-4bc6-8edc-9daae449c85a",
    category: "Football"
  },
  {
    title: "Malcolm Bagley 2010 Highlights",
    videoUrl: "https://youtu.be/Z75m1XEDODk?si=Og5PjOHMYR2WBj5j",
    description: "Malcolm Bagley 2010 Football Career Highlight Tape featuring top explosive plays.",
    ratingScore: 10,
    viewCount: 5400,
    uploadDate: "2026-07-29T02:55:33Z",
    id: "0fd6ae25-dc51-47ba-8171-c0a32d66197c",
    category: "Football"
  },
  {
    title: "PCTI VS WESTFIELD",
    videoUrl: "https://vimeo.com/1189619107?share=copy&fl=sv&fe=ci",
    description: "Passaic County Tech Bulldogs vs Westfield Blue Devils varsity clash.",
    ratingScore: 8.5,
    viewCount: 4100,
    uploadDate: "2026-07-26T21:28:59Z",
    id: "16f0eb62-eeb7-4401-b7c1-56847957a86b",
    category: "Football"
  },
  {
    title: "LYNDHURST VS PATRIOTS",
    videoUrl: "https://vimeo.com/1186568994?share=copy&fl=sv&fe=ci",
    description: "Lyndhurst Golden Bears vs Patriots high school game action reel.",
    ratingScore: 7.8,
    viewCount: 1900,
    uploadDate: "2026-07-26T21:36:52Z",
    id: "17ead62b-122f-41f8-a414-bff92f9f8536",
    category: "Football"
  },
  {
    title: "EASTSIDE VS PTCI BULLDOGS FULL GAME",
    videoUrl: "https://vimeo.com/1185744117?share=copy&fl=sv&fe=ci",
    description: "Paterson Eastside Ghostriders vs PCTI Bulldogs complete broadcast footage.",
    ratingScore: 8.0,
    viewCount: 6200,
    uploadDate: "2026-07-26T21:40:08Z",
    id: "19755649-ed78-4dab-8f84-b99c2dc52ab4",
    category: "Football"
  },
  {
    title: "MALCOLM BAGLEY 2010 FB",
    videoUrl: "https://vimeo.com/1213788436?share=copy&fl=sv&fe=ci",
    description: "Malcolm Bagley 2010 Football HD Broadcast Highlight Reel.",
    ratingScore: 10,
    viewCount: 8900,
    uploadDate: "2026-07-29T03:45:48Z",
    id: "19941050-abd2-4f9b-b5cf-c675cdbd1284",
    category: "Football"
  },
  {
    title: "w.o liv td",
    videoUrl: "https://vimeo.com/1186569386?share=copy&fl=sv&fe=ci",
    description: "West Orange vs Livingston clutch touchdown drive.",
    ratingScore: 7.5,
    viewCount: 2300,
    uploadDate: "2026-07-26T21:34:12Z",
    id: "1a0dd63d-eddf-4fc1-974f-1c980aab284d",
    category: "Football"
  },
  {
    title: "EO JAG VS SHABAZZ FLAG FOOTBALL",
    videoUrl: "https://vimeo.com/1179779190?share=copy&fl=sv&fe=ci",
    description: "East Orange Jaguars vs Malcolm X Shabazz High School Flag Football.",
    ratingScore: 8.8,
    viewCount: 4800,
    uploadDate: "2026-07-26T21:54:46Z",
    id: "1b751077-d247-4fb0-9b6b-b6360132cd67",
    category: "Flag Football"
  },
  {
    title: "west o vs north star BASKETBALL",
    videoUrl: "https://www.youtube.com/watch?v=60LfIbf1sF4",
    description: "West Orange Mountaineers vs North Star Academy Varsity Basketball thriller.",
    ratingScore: 8.9,
    viewCount: 7800,
    uploadDate: "2026-07-17T22:41:25Z",
    id: "29baaa7a-3e25-4608-930e-7428d70c615d",
    category: "Basketball"
  },
  {
    title: "West Orange versus Phillipsburg",
    videoUrl: "https://youtu.be/egvinHVSJVs?si=ayNyV6gj36u9p0_t",
    description: "West Orange High School vs Phillipsburg Stateliners inter-conference battle.",
    ratingScore: 8.1,
    viewCount: 3900,
    uploadDate: "2026-07-17T22:39:14Z",
    id: "2e5c124b-abf5-4296-bd95-5d6d8b19186e",
    category: "Football"
  },
  {
    title: "lue pic w.o vs payne",
    videoUrl: "https://vimeo.com/1186568986?share=copy&fl=sv&fe=ci",
    description: "West Orange vs Payne Tech pick-six interception highlight.",
    ratingScore: 7.9,
    viewCount: 2100,
    uploadDate: "2026-07-26T21:37:48Z",
    id: "39e3ba3c-f23c-4373-80fc-324353b1bcbc",
    category: "Football"
  },
  {
    title: "WEST ORANGE GIRLS FLAG GAME HD",
    videoUrl: "https://youtu.be/jFOXbGFXHVA?si=_zFXuouiIJi-dh9O",
    description: "West Orange Girls Flag Football HD Official Game Broadcast.",
    ratingScore: 9.1,
    viewCount: 5100,
    uploadDate: "2026-07-17T22:37:24Z",
    id: "3a170f1d-a2a9-4611-a853-09686e8b7cba",
    category: "Flag Football"
  },
  {
    title: "altanay.o game winner",
    videoUrl: "https://youtu.be/rHVSnGPXShg?si=JozTEZGH8BU9ySOm",
    description: "Altanay O. buzzer-beating game winner in championship final.",
    ratingScore: 9.8,
    viewCount: 11200,
    uploadDate: "2026-07-03T02:48:24Z",
    id: "3bdb2bd5-5b6c-43a7-b006-d8f8260fb03a",
    category: "Basketball"
  },
  {
    title: "Rebels vs. LA Conquer highlights | HS Girls Round of 16",
    videoUrl: "https://youtu.be/UcbmCBoOobM?si=kTInCVY6e1DBR6rG",
    description: "Rebels vs LA Conquer High School Girls National Tournament Round of 16.",
    ratingScore: 9.0,
    viewCount: 8400,
    uploadDate: "2026-07-29T02:46:12Z",
    id: "460a4c09-8635-4999-a83d-647342955c53",
    category: "Flag Football"
  },
  {
    title: "EAST ORANGE Cheer Comp impact 2026",
    videoUrl: "https://vimeo.com/1169420233?share=copy&fl=sv&fe=ci",
    description: "East Orange High School Cheerleading Competition Impact Championship 2026 performance.",
    ratingScore: 9.4,
    viewCount: 6700,
    uploadDate: "2026-07-26T22:01:05Z",
    id: "477cfbac-423e-43a3-97c7-67bb9541b504",
    category: "Cheerleading"
  },
  {
    title: "Jaguars Elite vs. Lace Up Junior highlights | HS Girls Round of 16",
    videoUrl: "https://youtu.be/aMJDmqEtuO8?si=-YulNMiR0HmZ3p3S",
    description: "Jaguars Elite vs Lace Up Junior Flag Football High School Girls Playoffs.",
    ratingScore: 8.7,
    viewCount: 4300,
    uploadDate: "2026-07-29T02:42:45Z",
    id: "47e337a1-2f9b-4fba-9743-5d35f325b890",
    category: "Flag Football"
  },
  {
    title: "WEST ORANGE FLAG VS NUTLEY",
    videoUrl: "https://vimeo.com/1181415291?share=copy&fl=sv&fe=ci",
    description: "West Orange Mountaineers vs Nutley Maroon Raiders Girls Flag Football.",
    ratingScore: 8.3,
    viewCount: 3100,
    uploadDate: "2026-07-26T21:48:38Z",
    id: "49ab9497-986b-4272-9041-c67211297476",
    category: "Flag Football"
  },
  {
    title: "cheer comp impact 2026 east orange jag",
    videoUrl: "https://vimeo.com/1169420147?share=copy&fl=sv&fe=ci",
    description: "East Orange Jaguars Cheer Team Routine at Impact 2026 Regional Finals.",
    ratingScore: 9.2,
    viewCount: 5800,
    uploadDate: "2026-07-26T22:03:19Z",
    id: "4e9514e1-cd35-43ea-bf10-766862ac30ad",
    category: "Cheerleading"
  },
  {
    title: "OIA West Regional | Apex Predators vs Bad Rabbits",
    videoUrl: "https://youtu.be/RvXuyFwwgI0?si=n3H7u5KFo8EVH4w6",
    description: "Oakley Icon Alliance West Regional: Apex Predators vs Bad Rabbits clash.",
    ratingScore: 9.6,
    viewCount: 9200,
    uploadDate: "2026-07-29T02:31:38Z",
    id: "4ea222a7-0efa-4d41-972b-53cc7f9dc9b0",
    category: "Flag Football"
  },
  {
    title: "Conquer Chargers compete for NFL Flag Championship",
    videoUrl: "https://youtu.be/NVJtsebkezw?si=P6iPFDZ8DhOwf7I9",
    description: "CBS LA Feature: Conquer Chargers compete for NFL Flag National Championship.",
    ratingScore: 9.9,
    viewCount: 18500,
    uploadDate: "2026-07-29T02:33:33Z",
    id: "4f8201b6-9331-45cd-9ec6-1a508384c9a8",
    category: "Flag Football"
  },
  {
    title: "BAYONNE VS WEEQUAHIC",
    videoUrl: "https://vimeo.com/1187180283?share=copy&fl=sv&fe=ci",
    description: "Bayonne Bees vs Weequahic Indians inter-county rivalry game.",
    ratingScore: 8.4,
    viewCount: 700,
    uploadDate: "2026-07-01T01:27:00Z",
    id: "50d53bf2-6f33-4071-85be-8eb75cda53da",
    category: "Football"
  },
  {
    title: "PCTI VS HC HIGHLIGHTS",
    videoUrl: "https://vimeo.com/1184421922?share=copy&fl=sv&fe=ci",
    description: "Passaic County Tech vs Hunterdon Central high school sports broadcast.",
    ratingScore: 8.1,
    viewCount: 2900,
    uploadDate: "2026-07-26T21:43:57Z",
    id: "50e03a7d-f9c1-4c7c-95b4-7069fbf43372",
    category: "Football"
  },
  {
    title: "2026 Youth Flag Football Championship: Girls 18U Final",
    videoUrl: "https://youtu.be/pUoUhtSJMkk?si=o7LhDUAyl1IVr0qz",
    description: "Official Flag Is Unlimited Broadcast: Girls 18U Championship Final match.",
    ratingScore: 9.7,
    viewCount: 16400,
    uploadDate: "2026-07-17T00:51:30Z",
    id: "57927713-72a3-4cac-8551-e769463add4f",
    category: "Flag Football"
  },
  {
    title: "AAU Nationals Complete Set 2 volleyball 2026",
    videoUrl: "https://youtu.be/Pq5McyYuCf4?si=h7w6cQM7geDUf3D8",
    description: "AAU Volleyball National Championships 2026 Complete Set 2 Action.",
    ratingScore: 8.8,
    viewCount: 5300,
    uploadDate: "2026-07-17T01:02:31Z",
    id: "6a6697aa-e089-4298-924d-791b47993688",
    category: "Volleyball"
  },
  {
    title: "LADY LIGHTNING HIGHLIGHTS EO",
    videoUrl: "https://youtu.be/8Vy7eBDCD04?si=6opV6VcWmsys7k1R",
    description: "East Orange Lady Lightning Travel Basketball & Flag Football Highlights.",
    ratingScore: 8.9,
    viewCount: 4600,
    uploadDate: "2026-07-03T02:40:19Z",
    id: "6a7a36e4-2bb6-4644-b9ab-43e908855179",
    category: "Basketball"
  },
  {
    title: "JTF Neon vs. Jaguars Elite | 14U Boys Quarterfinal",
    videoUrl: "https://youtu.be/59SqLy4XD6M?si=l6X6UMqlFO93Lome",
    description: "JTF Neon vs Jaguars Elite 14U Boys Quarterfinal National Tournament.",
    ratingScore: 9.3,
    viewCount: 6100,
    uploadDate: "2026-07-29T02:40:52Z",
    id: "6ce36378-cd82-4477-b8f2-262a1145301c",
    category: "Flag Football"
  },
  {
    title: "WEST ORANGE GF VS MOUNT 2026",
    videoUrl: "https://www.instagram.com/p/DYWJ-BwtgOx/",
    description: "West Orange Girls Flag Football vs Mount St. Dominic Instagram Highlight.",
    ratingScore: 8.6,
    viewCount: 3800,
    uploadDate: "2026-07-03T02:53:07Z",
    id: "70149929-79ae-4d4d-b2f4-81fb15628cd0",
    category: "Flag Football"
  },
  {
    title: "Jets Elite vs Conquer Chargers | 18U Girls | iFlag World Championships 2026 | Tampa | Flag Football",
    videoUrl: "https://youtu.be/gsa6-GlFwrs?si=xPct8ps1zc09Gvhw",
    description: "iFlag World Championships 2026 Tampa: Jets Elite vs Conquer Chargers 18U Girls.",
    ratingScore: 9.6,
    viewCount: 12900,
    uploadDate: "2026-07-29T02:27:10Z",
    id: "70e05d75-0828-440a-8f96-f27578c6ab1f",
    category: "Flag Football"
  },
  {
    title: "2026 Youth Flag Football Championship: Girls 14U Final",
    videoUrl: "https://youtu.be/aBu7jQCwSPI?si=QmqdV8684LgYgYWm",
    description: "2026 Youth Flag Football Championship: Girls 14U Final match coverage.",
    ratingScore: 9.1,
    viewCount: 7800,
    uploadDate: "2026-07-17T00:49:46Z",
    id: "7470f7a0-9249-4515-a9ce-7cde193e3015",
    category: "Flag Football"
  },
  {
    title: "EAST ORANGE HIGHLIGHTS VS MT",
    videoUrl: "https://vimeo.com/1180668428?share=copy&fl=sv&fe=ci",
    description: "East Orange High School vs Mount St. Dominic sports highlight compilation.",
    ratingScore: 8.0,
    viewCount: 2200,
    uploadDate: "2026-07-26T21:51:07Z",
    id: "74ff7c54-acb6-461d-97e8-c032839cfe53",
    category: "Flag Football"
  },
  {
    title: "St Benedict's Prep vs Livingston",
    videoUrl: "https://vimeo.com/1160673030?share=copy&fl=sv&fe=ci",
    description: "St Benedict's Prep Gray Bees vs Livingston Lancers showcase match.",
    ratingScore: 8.4,
    viewCount: 3100,
    uploadDate: "2026-07-26T22:05:04Z",
    id: "7d0433d8-b4f3-49fa-b40c-a906cb19caf4",
    category: "Basketball"
  },
  {
    title: "Orange vs Paterson jv Football Nov 6, 2013",
    videoUrl: "https://youtu.be/miZXaZ7Hk7A?si=zOFoMVvYovB3LTcg",
    description: "Classic Heritage Broadcast: Orange Tornadoes JV Football vs Paterson Youth Football.",
    ratingScore: 8.7,
    viewCount: 4500,
    uploadDate: "2026-07-29T02:38:50Z",
    id: "8290c013-d27e-4da6-be70-17e1cc27054e",
    category: "Football"
  },
  {
    title: "Belgium vs. Italy - Highlights | Week 3 | Men's VNL 2026 - Volleyball Nations League",
    videoUrl: "https://youtu.be/FjN0IWoQqUY?si=cS_qt1LgAIj4T-Ek",
    description: "Men's Volleyball Nations League 2026 Osaka Japan: Belgium vs Italy world-class sets.",
    ratingScore: 9.5,
    viewCount: 15100,
    uploadDate: "2026-07-17T01:04:18Z",
    id: "87bc4da4-6d90-4bc8-a4f2-812a38e25a0f",
    category: "Volleyball"
  },
  {
    title: "Flag Football - Bad Rabbits vs APEX - GAME 4 - 2026",
    videoUrl: "https://youtu.be/WiJ4jxrb9W8?si=ExuCf_qDf2nRVye6",
    description: "Game 4 National Series: Bad Rabbits vs APEX Predators flag football showdown.",
    ratingScore: 9.8,
    viewCount: 11900,
    uploadDate: "2026-07-17T01:00:54Z",
    id: "894c2bfe-551b-4799-9af1-4085afc72416",
    category: "Flag Football"
  },
  {
    title: "Conquer Chargers vs. Athena Warriors Select highlights | HS Girls Round of 16",
    videoUrl: "https://youtu.be/EisZR35WAUw?si=cga9mKNybhCmoZla",
    description: "Play Football & NFL Flag Coverage: Conquer Chargers vs Athena Warriors Select.",
    ratingScore: 9.2,
    viewCount: 8100,
    uploadDate: "2026-07-29T02:34:55Z",
    id: "8b38893f-5475-4f07-9379-e2c1554beb00",
    category: "Flag Football"
  },
  {
    title: "WEST ORANGE VS CENTRAL",
    videoUrl: "https://vimeo.com/1086260921?share=copy&fl=sv&fe=ci",
    description: "West Orange Mountaineers vs Central High School athletic conference match.",
    ratingScore: 8.0,
    viewCount: 1800,
    uploadDate: "2026-07-03T02:36:40Z",
    id: "97090ed3-3529-4689-a3eb-e814da9974ae",
    category: "Basketball"
  },
  {
    title: "LADY LIGHTNING GROC HIGHLIGHTS",
    videoUrl: "https://vimeo.com/1207226088?share=copy&fl=sv&fe=ci",
    description: "17U High School Travel Basketball & Flag Football Lady Lightning official highlights.",
    ratingScore: 9.0,
    viewCount: 44987,
    uploadDate: "2026-07-05T16:00:00Z",
    id: "983640ff-0ce5-4ef8-aa60-292e25104b09",
    category: "Basketball"
  },
  {
    title: "west o vs north star BOY BASKETBALL",
    videoUrl: "https://youtu.be/60LfIbf1sF4",
    description: "West Orange Boys Varsity Basketball vs North Star Knights rivalry game.",
    ratingScore: 8.7,
    viewCount: 3900,
    uploadDate: "2026-07-19T15:35:32Z",
    id: "9bdb4bd3-fd89-4b0e-9b38-788e34762a1a",
    category: "Basketball"
  },
  {
    title: "Oakley Icon Alliance | East Regional Recap",
    videoUrl: "https://youtu.be/6Yc68hsfNxk?si=-hcGUttpCGb33ZzO",
    description: "High-octane action and incredible athleticism from the OIA East Regional in New Jersey! Championship spots recap.",
    ratingScore: 9.6,
    viewCount: 13400,
    uploadDate: "2026-07-17T00:46:24Z",
    id: "9ccc906f-1452-40fd-8b2c-98db40484138",
    category: "Flag Football"
  },
  {
    title: "Flag football highlights 2026",
    videoUrl: "https://www.instagram.com/p/DW1yk85CepG/",
    description: "First year season performance reel showing growth, team bond, and elite flag football skill.",
    ratingScore: 8.8,
    viewCount: 2900,
    uploadDate: "2026-07-16T18:38:54Z",
    id: "9e73e889-0b5b-4d5f-8516-bcbf37164b26",
    category: "Flag Football"
  },
  {
    title: "We Cheer GYM",
    videoUrl: "https://youtu.be/awxuVA_vClI?si=6hqaV1o2btJPvqfN",
    description: "Elite tumbling, stunting, and gymnastics routines at We Cheer Gym.",
    ratingScore: 9.7,
    viewCount: 7100,
    uploadDate: "2026-07-03T02:42:07Z",
    id: "a37b10bf-9d22-49ee-bc7c-a52fb692efb5",
    category: "Cheerleading"
  },
  {
    title: "Jaguars Elite vs. BLA Elite | Full Girls 14U Flag Football Elimination Game | AAU Qualifier @ IMG",
    videoUrl: "https://youtu.be/nuNBCHW3TPs?si=HqRTE-AI6BZ5FinL",
    description: "AAU Qualifier @ IMG Academy: Jaguars Elite vs BLA Elite Girls 14U Flag Football Elimination Game.",
    ratingScore: 9.2,
    viewCount: 9600,
    uploadDate: "2026-07-17T00:55:51Z",
    id: "a3906ed7-ff5c-4783-b53e-60cc63bc20d5",
    category: "Flag Football"
  },
  {
    title: "WEST ORANGE FLAG VS LANCERS",
    videoUrl: "https://vimeo.com/1184422012?share=copy&fl=sv&fe=ci",
    description: "West Orange Girls Flag Football vs Livingston Lancers high school game.",
    ratingScore: 8.1,
    viewCount: 2400,
    uploadDate: "2026-07-26T21:41:15Z",
    id: "aae67ebc-43db-4148-8215-54c27ea06055",
    category: "Flag Football"
  },
  {
    title: "17U Girls Flag Football GIRLS GOT GAME! | Georgia Elite Classic",
    videoUrl: "https://youtu.be/Hss_RKlWiA4?si=fPe3zmyh1gftkq3g",
    description: "Georgia Elite Classic: 17U Girls Flag Football Girls Got Game Showcase.",
    ratingScore: 9.4,
    viewCount: 10800,
    uploadDate: "2026-07-17T00:56:39Z",
    id: "acc2edc0-6b97-40c4-8aab-9193cff54bfa",
    category: "Flag Football"
  },
  {
    title: "W.O VS PT HIGHLIGHTS",
    videoUrl: "https://vimeo.com/1186569407?share=copy&fl=sv&fe=ci",
    description: "West Orange vs Passaic Tech athletic reel.",
    ratingScore: 8.0,
    viewCount: 1000,
    uploadDate: "2026-07-01T01:25:04Z",
    id: "af2512c0-3378-4474-b5d6-05cec556619c",
    category: "Football"
  },
  {
    title: "NEW JERSEY HIGH SCHOOL GFFB HL PT.1",
    videoUrl: "https://vimeo.com/1186632296?share=copy&fl=sv&fe=ci",
    description: "New Jersey High School Girls Flag Football Highlight Reel Part 1.",
    ratingScore: 9.5,
    viewCount: 14200,
    uploadDate: "2026-07-26T21:31:54Z",
    id: "b6271034-d2ee-428d-9f2f-59cc0f70ba62",
    category: "Flag Football"
  },
  {
    title: "JUST1PLAY FLAG FOOTBALL LIFE",
    videoUrl: "https://youtu.be/8AWb6jl4kE4",
    description: "Official Just1Play Flag Football Life documentary & showcase reel.",
    ratingScore: 9.9,
    viewCount: 22400,
    uploadDate: "2026-07-19T15:32:20Z",
    id: "b6ae85b5-d249-44a0-812b-8e22767fb354",
    category: "Flag Football"
  },
  {
    title: "HARRISON HL VS LYN",
    videoUrl: "https://vimeo.com/1187552918?share=copy&fl=sv&fe=ci",
    description: "Harrison Blue Tide vs Lyndhurst Golden Bears football matchup.",
    ratingScore: 7.8,
    viewCount: 1600,
    uploadDate: "2026-07-26T21:29:54Z",
    id: "b6ca4c05-b34c-4210-8705-b693ff6c2b04",
    category: "Football"
  },
  {
    title: "St Benedict's Prep vs Livingston Basketball",
    videoUrl: "https://www.youtube.com/watch?v=PNkUMu_C2Sg",
    description: "St Benedict's Prep Gray Bees vs Livingston High School Varsity Basketball.",
    ratingScore: 8.9,
    viewCount: 4800,
    uploadDate: "2026-07-17T22:45:07Z",
    id: "bd9403c6-252e-44e5-8ba6-bf495f9d89f6",
    category: "Basketball"
  },
  {
    title: "wayne valley full game 2026",
    videoUrl: "https://vimeo.com/1181043175?share=copy&fl=sv&fe=ci",
    description: "Wayne Valley Indians official full game athletic tape.",
    ratingScore: 8.2,
    viewCount: 3500,
    uploadDate: "2026-07-26T21:50:01Z",
    id: "c4ad9311-7cce-4eda-8660-9d4086429b70",
    category: "Football"
  },
  {
    title: "LA Conquer vs. Texas Fury ATX Red highlights | HS Girls Championship Game",
    videoUrl: "https://youtu.be/g8NXTzgUXb4?si=Tw4fLPqcsyjKdJbt",
    description: "LA Conquer vs Texas Fury ATX Red High School Girls Flag Football National Championship Game.",
    ratingScore: 9.8,
    viewCount: 16800,
    uploadDate: "2026-07-29T02:44:47Z",
    id: "c883ced3-31c3-45d4-9b86-96c9f7a50709",
    category: "Flag Football"
  },
  {
    title: "PCTI VS MOUNT HIGHLIGHT",
    videoUrl: "https://vimeo.com/1179432481?share=copy&fl=sv&fe=ci",
    description: "Passaic County Tech vs Mount St. Dominic sports highlight.",
    ratingScore: 8.0,
    viewCount: 2100,
    uploadDate: "2026-07-26T21:55:34Z",
    id: "c8a9302f-eb5d-444e-9c05-ffa9b28d2b85",
    category: "Flag Football"
  },
  {
    title: "TEAM LIGHTNING WORKOUT V1",
    videoUrl: "https://youtube.com/shorts/o1AGurnwW0c?feature=share",
    description: "East Orange Team Lightning offseason speed, agility, & strength workout YouTube Short.",
    ratingScore: 9.1,
    viewCount: 5900,
    uploadDate: "2026-07-19T15:59:38Z",
    id: "cb39e67f-79f2-4141-8dfb-8788eb14a356",
    category: "Training"
  },
  {
    title: "Texas Fury One-Handed Touchdown | Oakley Icon Alliance West Regional",
    videoUrl: "https://youtu.be/xFDCwCfOWoA?si=I3xabcju0YPhvRM_",
    description: "Unbelievable one-handed touchdown catch by Texas Fury at OIA West Regional.",
    ratingScore: 10,
    viewCount: 19400,
    uploadDate: "2026-07-29T02:30:25Z",
    id: "cc77c3c2-2232-4b93-9145-6f43f00d56af",
    category: "Flag Football"
  },
  {
    title: "MOUNT VS WEST ESSEX GHBB 2026",
    videoUrl: "https://vimeo.com/1161913585?share=copy&fl=sv&fe=ci",
    description: "Mount St. Dominic vs West Essex High School Girls Varsity Basketball.",
    ratingScore: 8.3,
    viewCount: 2700,
    uploadDate: "2026-07-26T21:57:21Z",
    id: "d75ded36-7e54-42fe-8287-cab85f363ad2",
    category: "Basketball"
  },
  {
    title: "HARRISON VS SECAUCUS",
    videoUrl: "https://vimeo.com/1192136185?share=copy&fl=sv&fe=ci",
    description: "Harrison Blue Tide vs Secaucus Patriots high school athletic contest.",
    ratingScore: 8.1,
    viewCount: 1500,
    uploadDate: "2026-07-01T00:41:17Z",
    id: "d938396a-dcf6-4ac1-ab54-23b668cf2aac",
    category: "Football"
  },
  {
    title: "MILLBURN VS MOUNT ST HIGHLIGHT",
    videoUrl: "https://vimeo.com/1181796971?share=copy&fl=sv&fe=ci",
    description: "Millburn Millers vs Mount St. Dominic sports highlight reel.",
    ratingScore: 8.2,
    viewCount: 2200,
    uploadDate: "2026-07-26T21:47:48Z",
    id: "d9933bc5-f415-4481-a156-abfdaf9fdcef",
    category: "Flag Football"
  },
  {
    title: "Flag Football Conquer Chargers VS Bad Rabbits",
    videoUrl: "https://youtu.be/RIDGWwm7np4?si=sg9EQvuoAaJl8Ski",
    description: "National Flag Football Championship: Conquer Chargers vs Bad Rabbits.",
    ratingScore: 9.3,
    viewCount: 8900,
    uploadDate: "2026-07-17T00:57:47Z",
    id: "d9d6925e-99da-46a5-b452-2f796e751699",
    category: "Flag Football"
  },
  {
    title: "fair lawn vs wayne valley",
    videoUrl: "https://vimeo.com/1186568838?share=copy&fl=sv&fe=ci",
    description: "Fair Lawn Cutters vs Wayne Valley Indians high school video reel.",
    ratingScore: 8.0,
    viewCount: 2600,
    uploadDate: "2026-07-26T21:39:20Z",
    id: "ddc429b7-c471-4bee-a622-6ad8ce4a73b2",
    category: "Football"
  },
  {
    title: "west orange vs ridgewood",
    videoUrl: "https://vimeo.com/1190827225?share=copy&fl=sv&fe=ci",
    description: "New Jersey High School Flag Football 2026 West Orange vs Ridgewood Maroons.",
    ratingScore: 10,
    viewCount: 50758,
    uploadDate: "2026-07-01T01:14:26Z",
    id: "f2f16ddd-23da-4310-b6b6-6745235c2bd5",
    category: "Flag Football"
  },
  {
    title: "tornadoes vs west orange flag",
    videoUrl: "https://vimeo.com/1186569218?share=copy&fl=sv&fe=ci",
    description: "Orange Tornadoes vs West Orange Mountaineers Girls Flag Football.",
    ratingScore: 8.5,
    viewCount: 3400,
    uploadDate: "2026-07-26T21:35:50Z",
    id: "f526f612-f3c5-46a8-8bcd-a0638d696323",
    category: "Flag Football"
  },
  {
    title: "w.o baseball",
    videoUrl: "https://vimeo.com/1188578638?share=copy&fl=sv&fe=ci",
    description: "West Orange Mountaineers Varsity Baseball game highlights.",
    ratingScore: 8.6,
    viewCount: 2800,
    uploadDate: "2026-07-03T02:55:36Z",
    id: "f567a065-68ac-495f-99e4-7ef9faa2a11e",
    category: "Baseball"
  }
];

export const IMPORTED_CSV_VIDEOS: CsvVideoItem[] = RAW_CSV_ITEMS.map((item) => {
  const parsed = parseVideoUrl(item.videoUrl);
  
  // Seed sample community comments for active engagement
  const defaultComments: VideoComment[] = [
    {
      id: `c1-${item.id}`,
      authorName: 'Coach Marcus Vance',
      authorRole: 'D1 Scout & Recruiter',
      text: 'Explosive athletic speed on display here! Adding this film to our top prospect watchlist.',
      createdAt: '2 hours ago',
      likes: 12
    },
    {
      id: `c2-${item.id}`,
      authorName: 'Maya Rodriguez',
      authorRole: 'Varsity Athlete',
      text: 'Incredible game! That third quarter drive was pure poetry. Great job team! 🔥',
      createdAt: '1 day ago',
      likes: 8
    }
  ];

  return {
    ...item,
    videoType: parsed.type,
    embedUrl: parsed.embedUrl,
    platformName: parsed.platformName,
    likesCount: Math.floor((item.viewCount || 1000) * 0.08) + Math.floor(item.ratingScore * 10),
    comments: defaultComments
  };
});
