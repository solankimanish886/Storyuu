/**
 * Idempotent dev seed. Safe to run multiple times.
 * Run: npm run seed
 *
 * Creates: 4 channels → 2 stories → 2 seasons → 5 episodes each.
 * VoteQuestion on episode 5 of every season 1 (closed for story[0], open for story[1]).
 * Users: superadmin, admin, 2 readers with comp subscriptions, 1 reader without.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Channel } from '../models/Channel.js';
import { Story } from '../models/Story.js';
import { Season } from '../models/Season.js';
import { Episode } from '../models/Episode.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { VoteQuestion } from '../models/VoteQuestion.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI is not set'); process.exit(1); }

// ─── types ────────────────────────────────────────────────────────────────────

type VoteChoice = { title: string; description: string };
type VoteDef = { question: string; choices: [VoteChoice, VoteChoice, VoteChoice] };
type EpDef = { title: string; body: string; vote?: VoteDef };
type SeasonDef = { title: string; description: string; episodes: EpDef[] };
type StoryDef = { slug: string; title: string; overview: string; seasons: SeasonDef[] };
type ChannelDef = { slug: string; name: string; description: string; sortOrder: number; stories: StoryDef[] };

// ─── content ──────────────────────────────────────────────────────────────────

const CHANNELS: ChannelDef[] = [
  {
    slug: 'romance', name: 'Romance',
    description: 'Stories about love, passion, and the courage it takes to reach for connection.',
    sortOrder: 0,
    stories: [
      {
        slug: 'the-paris-affair', title: 'The Paris Affair',
        overview: 'Elise, a London illustrator, plans a quiet working trip to Montmartre. Thomas, a restorer of antique maps, has other ideas.',
        seasons: [
          {
            title: 'First Impressions',
            description: 'Two weeks, one café, and all the things that go unsaid.',
            episodes: [
              {
                title: 'Arrival',
                body: `Elise's flight landed forty minutes late, which meant her taxi driver took the scenic route to compensate, and she arrived at the studio near Abbesses with just enough energy to drop her suitcase and look out the window at a thin strip of grey Paris sky.\n\nShe had given herself two weeks to finish the illustrations for a children's book about a fox who learned to read maps. It had seemed manageable in London. Standing here now, it felt like borrowed time.\n\nThe café on the corner was still lit. She went in for coffee and ended up staying two hours, sketching the same corner of the room from three different angles while the espresso machine hissed and the city settled into the evening.`,
              },
              {
                title: 'The Regulars',
                body: `By the third morning Elise had mapped the café's rhythms. Claudette arrived at six-fifteen. A man in a paint-speckled jacket came at six-thirty, left exact change, and never said a word. Students filled the long table near the window by nine. And in the back corner, reliably, sat a man with old books spread across the table.\n\nHe handled them with deliberate care, turning pages as though they might dissolve. Once he glanced up and caught her looking. She turned back to her sketchbook faster than was dignified.\n\nThat afternoon she finished four of the stuck illustrations. The fox on page twelve had been resisting her for weeks; in this light, in this city, it came easily.`,
              },
              {
                title: 'A Borrowed Umbrella',
                body: `The rain arrived without warning. Elise was halfway back from the market, arms full of bread and a jar of preserves, when the first drops hit. She was reconsidering every decision she'd made that morning when someone held an umbrella over her head.\n\nThe man from the corner table. Up close he was younger than she'd guessed, and his French had the careful edges of someone who'd learned it as an adult. His name was Thomas. He was from Munich. He restored antique maps for a dealer near the Marais.\n\nShe returned the umbrella at the café the next day. He spread a map on the table — the city as it had been in 1762 — and asked if she wanted to go looking for what was left of it.`,
              },
              {
                title: 'La Vie en Rose',
                body: `The map was hand-drawn, the ink still sharp, the city strange and familiar at once. The Seine ran slightly differently. Streets that existed now did not exist then. Streets that had vanished were recorded in a careful copperplate hand.\n\nThey walked the old routes that afternoon, matching the map to the present city, finding where the two versions of Paris overlapped. Elise photographed every convergence. Thomas pointed out things she would have missed: a foundation stone, a widened corner, a wall that had once been a riverbank.\n\nSomewhere between the fourth and fifth street she realised she hadn't thought about London all day.`,
              },
              {
                title: 'Before You Go',
                body: `Her last full day arrived with the specific weight those days always carry. Elise packed her illustrations in the morning and spent the afternoon retracing the route she and Thomas had walked with the old map, checking each place against her memory.\n\nHe was at the café when she arrived at six. He didn't ask if she was leaving. He already knew. They sat for a long time with coffee that went cold, talking about his next project and her next book and other safe subjects.\n\nAt the door she stopped. He was watching her in a way that made everything very simple and very difficult at the same time.`,
                vote: {
                  question: 'Elise is standing at the door. What does she do?',
                  choices: [
                    { title: 'Write her number on a napkin', description: 'She writes her number on a napkin and hands it to him before she loses her nerve.' },
                    { title: 'Say goodbye and mean it', description: 'She says a proper goodbye. Some things should stay in Paris.' },
                    { title: 'Ask for his number instead', description: 'She asks for his number, leaving the next move entirely to him.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'Across the Distance',
            description: 'A postcard. A letter. A question neither of them has answered yet.',
            episodes: [
              {
                title: 'A Postcard',
                body: `The postcard arrived three weeks after she got back to London. It was a reproduction of the 1762 map — the dealer near the Marais apparently sold them as prints. Thomas had written four lines on the back in careful English, signed his name, and included nothing else.\n\nElise propped it against her monitor and finished the last two illustrations for the fox book. Her editor loved them. She didn't mention Paris.\n\nShe read the postcard again that evening. She counted the sentences. She counted them again.`,
              },
              {
                title: 'The Letter',
                body: `She wrote back on actual paper, which felt either romantic or absurd — she couldn't decide which. Three drafts before she found the right tone, something that wasn't too much, wasn't too careful, sounded like herself.\n\nShe described London in November: the early dark, the canal near her flat, a difficult client, a good lunch. She asked one question about a map he'd mentioned restoring. She sent it before she could write a fourth draft.`,
              },
              {
                title: 'His Paris, Her London',
                body: `They had been writing for six weeks when Thomas mentioned, in a single sentence, that he would be in London in January for a trade fair. The sentence was followed immediately by a paragraph about a fifteenth-century Portuguese chart.\n\nElise read the paragraph twice. She replied to it thoroughly. She did not reply to the sentence.\n\nHer flatmate told her she was being an idiot.`,
              },
              {
                title: 'January',
                body: `The trade fair ran Thursday to Sunday at a venue near Southwark. Thomas sent his hotel name in his Wednesday letter, mentioned the opening hours, and said nothing more direct than that.\n\nElise arrived on Friday afternoon, told herself she was just nearby, and found him at his table between a Dutch dealer and a woman selling antique atlases. He looked up and smiled the way people do when they have been expecting you.\n\nThey had dinner. They talked for four hours. On the way out she stepped in a puddle and he pretended not to notice.`,
              },
              {
                title: 'What Stays',
                body: `London in January is not a romantic city. It is grey and cold and the light is gone by four. And yet walking back from the restaurant, with Thomas a half-step to her left, Elise had the distinct feeling she was in exactly the right place.\n\nHe had one more day before his flight back to Paris. They had a map between them now — a different kind, one neither of them had drawn yet, full of blank spaces and unnamed streets.\n\nShe stopped at her corner. He stopped with her.`,
              },
            ],
          },
        ],
      },
      {
        slug: 'second-chances', title: 'Second Chances',
        overview: 'A marketing exec and a sous chef. Edinburgh. A conference, an old wound, and four days to decide whether some things are worth trying twice.',
        seasons: [
          {
            title: 'The Conference',
            description: 'Nadia planned a professional trip. She did not plan for James.',
            episodes: [
              {
                title: 'Check-In',
                body: `The hotel was recommended in the conference itinerary, which was the only reason Nadia had booked it, and the only reason she was standing at the front desk when James Calloway came out of the kitchen in his whites, looked at the clipboard in his hand, and then looked at her.\n\nNine years. He still had the same slight frown he used when he was trying to work something out.\n\n"You're the sous chef here," she said. It wasn't a question. The clerk handed her a key card and looked between them with professional neutrality.`,
              },
              {
                title: 'The First Dinner',
                body: `She ate at the hotel restaurant on principle — or stubbornness, which was sometimes the same thing. The scallops were very good. She refused to say so.\n\nJames came out at the end of service, which she hadn't expected. He sat down with a glass of water and asked how the conference was going. She told him. He listened the way he always had — properly, not waiting for his turn to speak.\n\nThey talked for forty minutes. They didn't mention anything before Edinburgh.`,
              },
              {
                title: 'The Kitchen Tour',
                body: `He offered to show her the kitchen before morning service. She went because she was curious about the kitchen. That was entirely the reason.\n\nThe prep cooks were already in. The morning light came through the high windows and made the stainless steel look gold. James moved through the space with the ease of someone who had spent years turning a room into an extension of himself.\n\n"You love this," she said. "Yes," he said, not embarrassed by it at all.`,
              },
              {
                title: 'Old Words',
                body: `On the third day he said something she recognised from before — a turn of phrase he'd always used, a particular way of dismissing his own intelligence. She had spent two years in therapy partly on the subject of how much she'd let that habit go unchallenged.\n\n"You do that thing," she said. "Where you make yourself smaller." He was quiet for a moment. "I know. I'm working on it."\n\nIt was a short answer. It was a different answer than he would have given nine years ago.`,
              },
              {
                title: 'Four Days',
                body: `The conference ended on the fourth afternoon. Her train to London left at six. James had Sunday service to run.\n\nThey met for coffee at three — her suggestion, which she'd made without thinking and then spent an hour analysing. He was already there when she arrived. He'd ordered for both of them, which was either presumptuous or a piece of evidence.\n\nOne hour. A table between them. Everything they'd discussed and everything they hadn't.`,
                vote: {
                  question: 'Nadia has one hour left with James. What should she do?',
                  choices: [
                    { title: 'Tell him honestly what these four days meant', description: 'She tells him exactly what the last four days have meant to her, regardless of what he says back.' },
                    { title: 'Ask him directly: did he plan this?', description: 'She asks whether he knew she\'d be at the hotel, and what that means if the answer is yes.' },
                    { title: 'Say goodbye and wait', description: 'She says a real goodbye and sees whether he reaches out first.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'After Edinburgh',
            description: 'The hard part isn\'t the feeling. It\'s the geography and the history.',
            episodes: [
              {
                title: 'The Text',
                body: `She was on the train when the message arrived. Seven words. She read it and put her phone face-down on the seat and watched the outskirts of Edinburgh give way to countryside.\n\nShe picked it up again outside Berwick. Read it again. The words meant what they meant; they were not complicated.\n\nShe typed three different replies and deleted two of them before the signal cut out near the border.`,
              },
              {
                title: 'Weekend Calls',
                body: `They talked on Sundays, which became a habit without either of them officially establishing it. James called after service; Nadia had usually just finished her weekend run. They talked for an hour, sometimes more.\n\nThe calls were easy. That was the problem — easy could be nostalgic. Easy could be the memory of something that didn't actually work. She mentioned this to her friend Cate. Cate told her to stop narrating her own life and just live it.`,
              },
              {
                title: 'What Broke Before',
                body: `She had a list — not written, but constructed over two years of making sense of the end: the way he'd disappeared into work when things got hard, the way she'd responded by getting colder, how they'd ended up living in the same flat like courteous strangers.\n\nShe knew her part in it. That was the thing therapy had done.\n\nJames, on a Sunday call in February, said: "I think I understand now what I was doing then." She didn't ask him to explain. She didn't need him to.`,
              },
              {
                title: 'Edinburgh Again',
                body: `She went back in March for no reason she was prepared to state plainly. She told her team she was scoping a potential client. The potential client was not in Edinburgh.\n\nJames met her at the door of a restaurant he'd chosen — smaller, personal, not where he worked. He had a reservation. He had thought about it in advance.\n\n"Hi," she said. "Hi," he said, and held the door.`,
              },
              {
                title: 'The Risk',
                body: `Over dinner she asked him: if she stayed, or if he moved — if they tried to solve the geography — was he certain enough to do it badly for a while? Because that was what it would take. Imperfect, not working yet, figuring it out.\n\nJames turned his wine glass slowly on the cloth. "I spent nine years being certain about the wrong things. I'm not certain about anything now. But I know what I want."\n\nIt was the most honest sentence she'd ever heard him say.`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'mystery', name: 'Mystery & Thriller',
    description: 'Crimes without easy answers. Suspects with reasons. Detectives who can\'t let go.',
    sortOrder: 1,
    stories: [
      {
        slug: 'the-locked-room', title: 'The Locked Room',
        overview: 'DS Priya Ahuja arrives at an impossible crime scene: a billionaire dead inside a sealed forty-second-floor office. No exits. No prints. No obvious motive — except for everyone who had one.',
        seasons: [
          {
            title: 'The Impossible Crime',
            description: 'A locked room. A body. And a security system that recorded nothing useful.',
            episodes: [
              {
                title: 'The Call',
                body: `The call came at eleven-forty on a Thursday, and DS Priya Ahuja was in a supermarket car park with a bag of groceries when she answered it. Forty-second floor of the Carver building downtown. A body. The door had been locked from the inside with a bolt that required a numbered key to open from either side.\n\nShe left the groceries in her boot and drove to the city centre with the radio off, thinking about bolt locks.\n\nThe lobby was already cordoned. Three uniforms, a duty sergeant she recognised, and a man in an expensive overcoat who identified himself as the victim's personal lawyer before she had the chance to ask.`,
              },
              {
                title: 'Floor Forty-Two',
                body: `The office was large and air-conditioned to a degree that felt deliberate. Marcus Carver was slumped at his desk, a single wound to the back of the head, no weapon visible. No sign of forced entry. The bolt lock — a heavy brass model requiring a numbered key — was engaged from the inside.\n\nThe security system logged everyone who entered and left the building, everyone with a key to the forty-second floor, everyone who had used the service elevator in the past forty-eight hours.\n\nPriya stood in the centre of the room and turned slowly, looking at the walls, the windows, the ceiling. Looking for the thing that was wrong.`,
              },
              {
                title: 'The Suspects',
                body: `By the following afternoon she had five people with keys to the floor: Carver's PA, his head of legal, a junior partner named Rowe, the building's chief of maintenance, and Carver's estranged daughter — who had apparently visited twice in the last month after three years of no contact.\n\nAll five had been in the building on Thursday. All five had left the floor before the estimated time of death. The security footage agreed with all five alibi accounts.\n\nPriya wrote all five names on the whiteboard and drew a line through none of them.`,
              },
              {
                title: 'The Camera',
                body: `The building's system was comprehensive — seven cameras on the forty-second floor alone. The footage had been reviewed and certified intact by two independent technicians. No anomalies. No gaps.\n\nAnd yet Marcus Carver was dead in a locked room.\n\nPriya went back to the footage of the maintenance chief — a man named Breckett, seventeen years with the building — and watched his seven-minute visit to the service corridor a second time. Then a third. Then she called the technical analyst and asked a question about the camera in the east stairwell.`,
              },
              {
                title: 'The Key',
                body: `The east stairwell camera had been replaced six weeks ago. The old unit had a twelve-second warm-up lag after a power interruption — enough time to move through a doorway unseen. The building had experienced two brief outages in the last month, both attributed to maintenance testing.\n\nBreckett had been the maintenance chief for seventeen years. He knew every camera, every lag, every corridor.\n\nShe drove to his flat that morning. He opened the door before she knocked.`,
                vote: {
                  question: 'Priya is at Breckett\'s door. What is he?',
                  choices: [
                    { title: 'The killer', description: 'He had the means, the knowledge, and a motive she hasn\'t uncovered yet.' },
                    { title: 'A witness who stayed silent', description: 'He saw who did it and has been waiting for someone to come and ask.' },
                    { title: 'An accomplice who was paid', description: 'He created the window of opportunity for someone else — and is now regretting it.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'The Truth Beneath',
            description: 'Every answer surfaces a deeper question.',
            episodes: [
              {
                title: 'What Breckett Knew',
                body: `Breckett made tea before he said anything. Priya waited. She had learned, over twelve years, that people who made tea first were generally about to tell you something true.\n\nHe had not killed Marcus Carver. The second thing he said was that he had seen who did, and had said nothing, because the person had given him very clear reasons to stay quiet.\n\nHe put the tea down and sat across from her.`,
              },
              {
                title: 'The Daughter',
                body: `Alicia Carver had not visited her father twice in the last month. She had visited four times. Two of those visits did not appear in the official building log because Breckett had let her in through the service entrance.\n\nShe was thirty-one. Estranged since a trust dispute had ended with her losing and her lawyer resigning. She currently worked for a firm that competed directly with her father's holding company.\n\nNone of that proved anything. Priya requested her phone records anyway.`,
              },
              {
                title: 'The Document',
                body: `Carver had been planning to change his will. His personal lawyer — who had given Priya his card in the lobby on the night of the murder — had prepared the draft three days before the death. Under the new version, Alicia received nothing. Under the old version, still valid, she inherited forty percent.\n\nThe lawyer had not mentioned this during the first interview.\n\nPriya drove back to his office and asked him why.`,
              },
              {
                title: 'The Recording',
                body: `The lawyer, Aldrich, was more frightened than guilty. It took twenty minutes to establish that. What he was frightened of was a voice recording — Carver threatening him in 2019 — that Alicia had somehow obtained and sent to him the day after her father's death.\n\nShe had not told him to do anything with it. She had simply sent it. The message, Aldrich said, was clear enough.\n\nPriya sat with this. Obstruction, possibly. Or a grieving woman with a complicated father, hitting back reflexively.`,
              },
              {
                title: 'Closed',
                body: `Alicia Carver had been on the forty-second floor for fourteen minutes on Thursday night. The camera lag gave her twelve seconds in each direction. She had left through the service door at 22:54. The coroner placed time of death between 22:45 and 23:10.\n\nPriya sat in her car outside the building and looked at the timeline. It was tight. It was possible. It was very nearly enough.\n\nShe called the Crown Prosecution Service and used the word "possibly" twice, which she rarely did, and they both knew what that meant.`,
              },
            ],
          },
        ],
      },
      {
        slug: 'midnight-caller', title: 'Midnight Caller',
        overview: 'Investigative journalist Leo Vance starts receiving voicemail messages at 3 AM from a caller who claims to be the only witness to a murder ruled a suicide twelve years ago.',
        seasons: [
          {
            title: 'The Messages',
            description: 'Someone knows what happened on Finch Street. They\'ve chosen Leo to hear it.',
            episodes: [
              {
                title: '3 AM',
                body: `The first message was forty-three seconds long. Leo played it twice in the dark at three in the morning, phone held close to his face, trying to decide if the voice was a man or a woman and whether this was a prank or something else.\n\nThe caller described a house on Finch Street. A woman named Eleanor Cross. A night in November twelve years ago when the police had found her at the bottom of her stairs and ruled it accidental.\n\n"She didn't fall," the caller said. Then they hung up.`,
              },
              {
                title: 'The Archive',
                body: `Leo spent the morning in the paper's archive searching for Eleanor Cross. He found eight column inches from twelve years ago — a brief, the kind that ran when there was space: woman, 52, found dead at her home, death ruled accidental, no suspicious circumstances. No photograph. No named relatives.\n\nHe called the paper's former crime correspondent, now retired, who had covered the area at the time. She remembered the case. She said she'd always thought the report was thin.`,
              },
              {
                title: 'Finch Street',
                body: `The house had been sold twice since Eleanor Cross died in it. The current owners had repainted and replanted, done the things people do to make a house feel like theirs. A family lived there now with two young children.\n\nLeo stood on the pavement and looked at it. A woman died here and was recorded as a footnote. Someone remembered it differently.\n\nThe second message arrived at three the following morning. The caller gave him a name: David Sterne.`,
              },
              {
                title: 'David Sterne',
                body: `David Sterne was fifty-eight, a retired civil engineer living in Wimbledon. He had been Eleanor Cross's neighbour on Finch Street for four years before her death and two years after, at which point he had moved and severed contact with everyone he knew there.\n\nHis name appeared nowhere in the original report. He had not been interviewed. Either no one had known to ask, or someone had ensured they didn't.\n\nLeo knocked on his door on a Tuesday afternoon. The man who answered looked like someone who had been waiting a long time to be found.`,
              },
              {
                title: 'Dead Air',
                body: `David Sterne told him about the car parked outside Eleanor's house on the night she died. A silver car, a model he recognised, belonging to a man he could name — a man who had, in the twelve intervening years, been elected to Parliament.\n\nHe had tried to report it twice. The first time nothing happened. The second time he received a phone call at three in the morning from someone who explained in calm and careful language what would happen if he tried again.\n\nHe looked at Leo across his kitchen table. "Someone has to know. It just took me this long to find someone I thought would print it."`,
                vote: {
                  question: 'Leo has a name, a witness, and no corroboration. What should he do?',
                  choices: [
                    { title: 'Publish now', description: 'Publish what he has. The public interest outweighs waiting for perfect corroboration.' },
                    { title: 'Find corroboration first', description: 'Hold the story until he has a second source, even if it takes months.' },
                    { title: 'Confront the MP directly', description: 'Go to the MP with what he knows and see how he responds before publishing anything.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'Following the Thread',
            description: 'The deeper Leo digs, the more obvious it becomes that someone is watching him do it.',
            episodes: [
              {
                title: 'The Editor',
                body: `His editor Rosaria listened to the full account without interrupting, which she only did when she was taking something seriously. At the end she asked three questions: what he could prove, what he could corroborate, and whether David Sterne would go on record.\n\nHe could prove the death was real. He could not corroborate the car or its owner. Sterne would go on record, conditionally.\n\n"Find me one more source," she said. "One verifiable thing. Then we talk."`,
              },
              {
                title: 'The Second Neighbour',
                body: `Electoral rolls and old community newsletters — the other former residents of Finch Street were not difficult to find. Six had moved away; two remained in the borough.\n\nThe second woman Leo found had not spoken to anyone about that night in twelve years. She had reasons that became clear quickly: she worked for the same MP's constituency office.\n\nShe closed her door on him. Then she opened it and told him to come back on Saturday when her husband was home.`,
              },
              {
                title: 'The Car',
                body: `The silver Volvo V70 was registered between 2001 and 2008 to a private company. The company had three directors. One of them was the MP's brother-in-law.\n\nIt was not direct. It was not proof. It was a thread that, pulled carefully and legally, connected to a thing someone had gone to considerable effort to keep buried.\n\nLeo documented it, source-cited it, and emailed a copy to an encrypted account he kept for material he didn't want to lose if his regular accounts were compromised.`,
              },
              {
                title: 'The Third Message',
                body: `The third voicemail was different. The caller's voice was tighter. They said Leo had been seen visiting Sterne. They said this was going further than it should.\n\nThey did not threaten him. That was the notable thing. They warned him. There was a distinction, and Leo had been in the job long enough to understand what it meant: someone was frightened, not powerful.\n\nHe played the message to Rosaria. She said: "I want a first draft by the end of the month."`,
              },
              {
                title: 'Publication',
                body: `The story ran on a Thursday morning. By Friday it had been picked up by the nationals. By Saturday the MP had issued a statement through his solicitors that said nothing contradicting anything Leo had written, and confirmed most of it by implication.\n\nDavid Sterne called at noon on Saturday. He was not happy exactly — the situation was too large and too old for happiness — but he sounded lighter, the way people do when they have set down something they've carried for too long.\n\n"Thank you," he said. "Thank you," Leo said. He meant it.`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'fantasy', name: 'Fantasy',
    description: 'Worlds that don\'t exist yet. Magic that costs something. Characters who make choices that matter.',
    sortOrder: 2,
    stories: [
      {
        slug: 'crown-of-embers', title: 'Crown of Embers',
        overview: 'Seren has spent her life staying invisible. When she accidentally ignites a flame with her bare hands, she discovers she carries the blood of the Ember Throne — a dynasty everyone believes extinct.',
        seasons: [
          {
            title: 'The Awakening',
            description: 'You can only hide what you are until you can\'t.',
            episodes: [
              {
                title: 'Market Day',
                body: `Seren had developed invisibility into a skill. Small words, small clothes, a stall at the far end of the market where her grandmother sold powdered herbs to people who preferred old remedies. She knew the name of every plant in the region and the uses of most of them. She knew how to weigh things accurately and make change without looking at her hands.\n\nShe did not know, until the morning of the autumn market, that she could set fire to things by touching them.\n\nIt started with the copper bowl. Her fingers were cold from grinding cinnamon since before dawn. The metal warmed under her palms — that was normal — and then went very, very bright.`,
              },
              {
                title: 'The Burning',
                body: `The bowl didn't melt. It glowed orange-white and the herbs inside caught without a spark, burning cleanly, and she yanked her hands back and looked at them. Her skin was unmarked. The bowl sat on the table and cooled from the outside in.\n\nHer grandmother had come around the stall by then. She looked at the bowl. She looked at Seren's hands. She said nothing for what felt like a very long time.\n\n"We need to close the stall," she said finally. "We need to go home."`,
              },
              {
                title: 'The Locked Room',
                body: `Her grandmother's house had a room Seren had never been allowed into. The lock was old iron. That evening her grandmother opened it for the first time.\n\nThe room held boxes, old books, a wooden chest from somewhere south the family had left before Seren was born. And a folded cloth, deep red, embroidered at the edges with a pattern of ascending flame.\n\n"Your mother was the third daughter of the second son of the last true Ember line," her grandmother said quietly. "I have been hoping you took after your father."`,
              },
              {
                title: 'Fugitive',
                body: `They left before dawn. Her grandmother had a plan — it was clear from the speed of it that the plan was old, prepared, waiting only for the moment it was needed. A cart, a route north, a name in a village two days away.\n\nSeren carried the cloth and two books from the locked room. She had not yet cried; she was saving it for somewhere that felt safer than this road.\n\nBy midday the village was far behind them. The sky was the particular grey that in this country came before either rain or snow.`,
              },
              {
                title: 'Blood Speaks',
                body: `The relay village was a way station; the woman who met them knew only that she was to pass them north and ask no questions. She made bread with caraway seeds and looked at Seren's hands once, without comment, before going to bed.\n\nSeren sat by the fire that evening and tested the thing carefully: a small flame, the size she wanted, held steady. It obeyed her. That was the part she hadn't expected — the ease of it, now that she'd stopped hiding from herself.\n\nNorth of here was the old capital. North of here, her grandmother said, were people who would know what she was and what it meant.`,
                vote: {
                  question: 'Seren is heading to the old capital. What approach should she take?',
                  choices: [
                    { title: 'Arrive openly as the heir', description: 'Claim her lineage openly and let her enemies show themselves.' },
                    { title: 'Arrive in disguise', description: 'Learn who can be trusted before revealing herself to anyone.' },
                    { title: 'Send her grandmother ahead', description: 'Let her grandmother make contact first while Seren waits at the relay village.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'The Old Capital',
            description: 'Power is never just power. It comes with people attached.',
            episodes: [
              {
                title: 'The North Gate',
                body: `The old capital looked nothing like the stories. The stories had towers; the reality had scaffolding. Thirty years of neglect followed by cautious rebuilding had produced a city architecturally uncertain — old bones, new walls, everything in the process of becoming something.\n\nSeren arrived at the north gate in the relay woman's cart, wearing a borrowed cloak, carrying a basket of hard cheese. She had never been inside a city this large.\n\nThe gate guards checked the cart. She held the cheese and looked at the middle distance and thought about nothing at all.`,
              },
              {
                title: 'The Bookbinder',
                body: `The name her grandmother had given her belonged to a bookbinder who worked off the third market street and displayed no sign outside his door. His name was Oswin. He was sixty-three, had a thin white scar from his left ear to his chin, and took one look at Seren before closing the shop and pulling the shutters.\n\nHe did not seem surprised. He seemed, if anything, relieved.\n\n"We've been watching for someone like you for twenty-two years," he said.`,
              },
              {
                title: 'The Network',
                body: `There were more of them than she had expected. Not many — thirty, perhaps forty, scattered through the capital and surrounding towns. They had been a resistance organisation once; now they were mostly an archive, a collection of people who had preserved records when records were dangerous and had not yet decided what to do with what they'd kept.\n\nThey disagreed about her. Some thought her existence changed everything. Others thought a bloodline was a liability, not a resource.\n\nShe sat in Oswin's back room and listened to them argue about her in the third person.`,
              },
              {
                title: 'The Price of a Name',
                body: `The current governor of the capital had people watching for signs of the Ember line. This, Oswin explained, was a precaution against exactly what Seren represented.\n\nSomeone in the network had already talked. A message had been sent — not to the governor, but to someone who served him, who was known to sell information.\n\nOswin did not know who had talked. That was the second problem.\n\n"You have three days," he told her, "before this becomes the kind of situation that can't be managed quietly."`,
              },
              {
                title: 'The Choice',
                body: `Three days became one. The messenger was found — a young man with a gambling debt — and he told them who he'd sold the information to. That person was closer than they'd hoped.\n\nSeren stood in Oswin's back room with fire in both palms, which she did not intend as a threat and hoped did not look like one, and looked at the faces around her.\n\nThey needed her to be something. She wasn't certain yet what she was, but she was certain she was done being invisible.`,
              },
            ],
          },
        ],
      },
      {
        slug: 'the-silver-court', title: 'The Silver Court',
        overview: 'Lady Mira Solaine arrives at the Silver Court as a political bride and quickly realises the kingdom runs on secrets — including hers.',
        seasons: [
          {
            title: 'The New Arrival',
            description: 'The Court has its own rules. Learning them before someone uses them against you is the game.',
            episodes: [
              {
                title: 'The Betrothal Carriage',
                body: `Mira had been told the Silver Court was beautiful. It was. It was also cold in a way that had nothing to do with the weather — a sustained, architectural coldness built into the arrangement of rooms and the timing of meals and the way everyone looked at her with careful, uninformative eyes.\n\nHer future husband met her in the entrance hall. He was twenty-seven, polite, and clearly somewhere else entirely in his thoughts. He said the right things. She said the right things. A steward showed her to her rooms.\n\nShe sat on the bed and began to make a list of everything she'd observed.`,
              },
              {
                title: 'The Welcome Dinner',
                body: `The formal welcome had thirty-eight people at the table and more political content than most treaties. Mira sat at the centre and was the topic of half the conversation and the subject of none of it — referenced obliquely, assessed without eye contact, positioned by people who had never spoken to her.\n\nShe smiled and ate and responded and catalogued.\n\nThe woman directly opposite was watching with a quality of attention that felt, for the first time all evening, genuinely personal.`,
              },
              {
                title: 'Lady Veth',
                body: `Her name was Lady Veth Carran. The king's second cousin, fourteen years at Court, survivor of three changes of inner circle. When Mira asked how, Veth described her method as "not taking sides in arguments I haven't joined yet."\n\nShe said this over tea the morning after the welcome dinner, having invited herself, which Mira found preferable to being managed.\n\n"You're not what they expected," Veth said. "They expected someone easier to read." She said it as a fact, and waited to see what Mira would do with it.`,
              },
              {
                title: 'The First Secret',
                body: `She found the first secret by accident, as one generally did. A door left ajar in a wing she hadn't been directed to. Voices — her husband's, and a man she hadn't placed — discussing a shipment not listed in any official record.\n\nShe didn't linger. She filed it.\n\nLater that evening she thought about her own secrets — the ones she had been sent here carrying, the ones her family had given her along with the betrothal contract — and wondered how much the Court already knew.`,
              },
              {
                title: 'The Quiet War',
                body: `By the end of her third week Mira had identified two factions, three power-players who belonged to neither, and one man — who served wine at formal dinners and had never looked directly at her — who reported to someone outside the Court entirely.\n\nShe had not determined what her husband's shipment was for, what Lady Veth actually wanted, or how much the king knew about any of it.\n\nShe also had not yet been asked to do anything dangerous, which meant whatever they'd sent her here to do was still coming.`,
                vote: {
                  question: 'Mira has been at Court three weeks. What should her next move be?',
                  choices: [
                    { title: 'Trust Lady Veth', description: 'Propose a genuine alliance with Veth and share what she knows.' },
                    { title: 'Confront her husband', description: 'Ask him directly about the shipment and judge his response.' },
                    { title: 'Report home and wait', description: 'Send everything she\'s learned to her family and wait for instructions.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'The Hidden Game',
            description: 'Everyone at the Silver Court is playing. Not everyone knows the stakes.',
            episodes: [
              {
                title: 'The Alliance',
                body: `Veth came to her rooms at an hour that was technically acceptable but practically unusual. She brought no tea. She closed the door.\n\n"There is going to be a move against the treasurer in the next fortnight. I have been asked to be involved. I am choosing not to be. I am telling you because you will hear about it from someone else first, and I would rather you heard it from me."\n\nMira considered this. "Why?" "Because you're going to be here a long time," Veth said. "I prefer to be aligned with people who think before they act."`,
              },
              {
                title: 'The Treasurer',
                body: `His name was Aldric Norn. Nine years in position, which at the Silver Court was tenure. He controlled the accounts, managed the king's private purse, and had accumulated a set of personal records that were, according to Veth, the actual reason for the move against him.\n\nNot incompetence. Not corruption. Records.\n\n"He knows where the money has gone," Veth said. "Including money that wasn't supposed to move at all."`,
              },
              {
                title: 'What Mira Carries',
                body: `Her family had sent her here with a specific instruction: learn the status of a trade agreement stalled for four years. A quiet ask, framed as curiosity.\n\nStanding now in the middle of a Court where the treasurer was about to be removed for knowing too much, Mira understood that the trade agreement was not the only thing her family was asking her to learn.\n\nShe wrote a careful letter home that said nothing except: things here are more interesting than anticipated. More soon.`,
              },
              {
                title: 'The Wine Steward',
                body: `The man who served wine at formal dinners was named Pol. Six years in the Court's service, recruited from a minor southern household, no connection to anything significant on paper.\n\nMira had been watching him for two weeks. She had seen him pass a folded note to a woman at the market. She had seen the woman meet a rider at the city's east gate.\n\nShe could not yet read the correspondence. But she had a very good idea of where it was going.`,
              },
              {
                title: 'The Revelation',
                body: `The treasurer was removed on a Tuesday, quietly, with a cover story about health. He was not harmed. He was simply gone, his rooms cleared by the following morning.\n\nMira went to Veth. Veth had nothing new. They sat with that for a moment.\n\nThen Mira told her about Pol and the rider and the east gate. She watched Veth's careful face do something she hadn't seen it do before — genuine surprise, quickly controlled — and understood that whatever Veth knew, she hadn't known this.`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'contemporary', name: 'Contemporary',
    description: 'People trying to live their lives. The ordinary things that turn out not to be.',
    sortOrder: 3,
    stories: [
      {
        slug: 'coffee-at-three', title: 'Coffee at Three',
        overview: 'The Nightjar diner in Chicago stays open until dawn. Four strangers keep ending up in the same corner booth: a night-shift nurse, a grad student, a recently divorced contractor, and a teenage runaway.',
        seasons: [
          {
            title: 'The Regulars',
            description: 'Nobody plans to become a regular at a 3 AM diner. And then they do.',
            episodes: [
              {
                title: 'The Nightjar',
                body: `The Nightjar had been open twenty-four hours a day for thirty-one years without interruption, including three blizzards, a burst pipe, and one occasion when the cook quit mid-service and the owner's teenage daughter made scrambled eggs for forty people without being asked. It occupied a corner of the North Side in the specific way only certain businesses do: too unglamorous to be a destination, too reliable to be replaced.\n\nDee, who owned it, had been running it since her mother retired. She knew her regulars the way you know song lyrics — not through effort, but through repetition.\n\nThe corner booth had been claimed, each night this week, by four different people who had never spoken to each other.`,
              },
              {
                title: 'Rosa',
                body: `Rosa was thirty-four and worked paediatric nights at the hospital six blocks over. She came in at two-forty-five, ordered black coffee and whatever pie was left, and sat in the corner booth with a paperback she rarely read more than three pages of before her brain refused further input.\n\nShe had been doing this for two years. It was the half-hour between work and the apartment where she didn't have to be anything in particular — not competent, not responsible, not the person who made decisions at two in the morning about things that mattered.\n\nShe was reading the same paragraph for the fourth time when the grad student sat across from her without asking.`,
              },
              {
                title: 'Marcus',
                body: `His name was Marcus and he was writing a dissertation on urban commons spaces, which he described in one sentence before clearly deciding it was too much and asking instead how the pie was. The pie was lemon, and good.\n\nHe was twenty-seven, from Atlanta, in Chicago for the degree. He came to the Nightjar when the library closed and the quiet of his apartment became the kind that felt like pressure.\n\nBy three-fifteen, when the contractor arrived with sawdust still in his hair, they were midway through a conversation about whether night-shift workers were the same people they were in daylight.`,
              },
              {
                title: 'Gil',
                body: `Gil didn't usually sit with people. He ordered a short stack and coffee at the counter and looked at his phone, which had been his routine for six months, since the house sold and there was no longer any useful reason to be home at a particular time.\n\nThe booth was full except for one seat. Dee gestured at it. He sat.\n\nRosa didn't look up from her book, which he respected. Marcus said hello and didn't push. It was, he would think later, the most comfortable room he'd been in since the divorce.`,
              },
              {
                title: 'Five in the Morning',
                body: `The girl came in at four-fifty. Maybe sixteen, maybe younger, carrying a duffel bag and wearing a jacket too thin for the weather. She stood at the door looking at the room with an expression Gil recognised as someone calculating whether a space was safe.\n\nDee went over. He watched the conversation — quiet, Dee's hands still, the girl's chin coming up slightly.\n\nDee seated her at the counter. Brought her soup without being asked. Looked, briefly, at the corner booth.\n\nRosa was already putting her book away.`,
                vote: {
                  question: 'A teenager is at the counter alone at five in the morning. What should the booth do?',
                  choices: [
                    { title: 'Let Dee handle it', description: 'Dee knows how to do this. The girl came to the diner, not to them.' },
                    { title: 'Rosa approaches first', description: 'Rosa works with kids. A woman approaching alone is less threatening.' },
                    { title: 'Make space at the booth', description: 'All four of them make room and let the girl decide if she wants company.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'What We Carry',
            description: 'Three in the morning is a good time to put things down.',
            episodes: [
              {
                title: 'Juno',
                body: `Her name was Juno. Seventeen, from a suburb an hour west. She'd been in the city three days when she walked into the Nightjar, and she answered questions in a way that was technically truthful and comprehensively uninformative — a skill Rosa recognised from work and respected for different reasons at three in the morning.\n\nShe came back the following night. And the night after. She sat at the counter with Dee and eventually moved to the booth when Gil waved her over.\n\n"You don't have to explain anything," he said, which turned out to be exactly the right thing.`,
              },
              {
                title: 'Rosa\'s Nights',
                body: `Rosa had not told anyone at the booth what her nights at work actually involved. She mentioned the hospital and the hours; she did not mention the specific texture of a bad shift, the weight of what she carried home.\n\nMarcus asked one evening — not prying, just genuinely curious — what made a shift hard. She put down the cup and answered honestly. Ten minutes, no interruptions.\n\nNobody said anything difficult afterward. Gil refilled everyone's coffee. It was, Rosa thought, a very decent response.`,
              },
              {
                title: 'Marcus\'s Chapter',
                body: `The dissertation was not going well. Marcus described this in academic language at first, then in plain language after Rosa said she had no idea what a "theoretical framework failure" was.\n\nHe had slowly developed the suspicion that the Nightjar was, accidentally, a better case study than anything he'd planned. The problem was his committee would not accept a personal anecdote as data.\n\n"Use us," Gil said. "Interview us. Properly. We'll sign whatever."`,
              },
              {
                title: 'Gil\'s House',
                body: `Gil had bought the house at twenty-nine and lived in it for eleven years and worked on it every weekend and he could name every repair he'd ever made. It had sold for more than they'd paid. He now had nowhere to put the money except a savings account and nowhere to put himself except a rental that smelled of someone else's cleaning products.\n\nHe told Juno this on a quiet Tuesday. She was seventeen and recently homeless and she listened without pity, which was the correct response.\n\n"At least you know what you lost," she said. "That's something."`,
              },
              {
                title: 'December',
                body: `A blizzard on the fourteenth meant the Nightjar was quieter than usual, just the four of them and two cab drivers waiting out the worst of it. Dee made a pot of good coffee and left it on the table.\n\nThey had been meeting here, informally, for four months. Nobody had planned it. But Juno had a key to Rosa's apartment for emergencies, Marcus had sent Gil three job listings that weren't awful, and Rosa had called Juno's mother once from the hospital, which had been the right call.\n\nThe snow came down outside. Inside was the corner booth, the coffee, the four of them.`,
              },
            ],
          },
        ],
      },
      {
        slug: 'the-comeback', title: 'The Comeback',
        overview: 'Zoe Park was ranked fourth in the world when a torn ACL ended her season. Two years, one surgery, and a great deal of doubt later, she\'s in the qualifying rounds of a grass-court tournament. Nobody expects her to make it through.',
        seasons: [
          {
            title: 'The Qualifying Rounds',
            description: 'The comeback isn\'t the ranking. It\'s just getting back on the court.',
            episodes: [
              {
                title: 'Grass Court',
                body: `The tournament was a 250. Not a Slam, not anything that would have appeared in her calendar two years ago except as a warm-up. The qualifying draw had twenty-two players. Zoe had played three of them before, beaten two, and was not certain that the rankings from then meant anything about now.\n\nShe arrived the day before, walked the courts, had a quiet dinner with her coach Beatriz, who did not give motivational speeches and did not pretend the draw was easy.\n\n"Court four, ten-thirty," Beatriz said. "Sleep well."`,
              },
              {
                title: 'Match One',
                body: `Her opponent was Croatian, twenty years old, ranked 187, with a flat forehand that stayed very low on grass and absolutely nothing to lose.\n\nZoe won the first set 6-4 and dropped the second 3-6 and stood at the baseline in the third thinking about nothing except the next point, which Beatriz had always said was the only thing worth thinking about — easy to say and hard to do and she was doing it.\n\nShe won the third set 7-5. She sat down afterward and her knee was fine.`,
              },
              {
                title: 'Match Two',
                body: `The second match was against a Spaniard she had beaten twice before, in different circumstances, in different versions of herself. She won it in straights, 6-3, 6-4, and it felt cleaner than the first — more like playing tennis, less like proving something.\n\nBeatriz said: "Your serve was back today." It had been. That was the sentence that mattered, not the ranking or the round or the fact that people had started to notice her on the draw sheet. The serve.`,
              },
              {
                title: 'The Journalist',
                body: `A journalist she recognised from the tour asked for five minutes. She gave him five minutes. He asked the questions they always asked — how does it feel, when did you know you were ready, what do you think about being a story again.\n\nShe gave him the useful answers: focused on the process, present, grateful for her team. All true. None of it the full truth.\n\nThe full truth was more complicated and not his to have.`,
              },
              {
                title: 'Into the Main Draw',
                body: `She won the final qualifying match 6-2, 7-6 on a tiebreak she shouldn't have needed, against a player she had underestimated in the second set, which was the sort of thing you didn't do and then you did.\n\nThe main draw board went up that evening. Her name was on it. She sat in her room with her phone off and looked at the wall for a while.\n\nBeatriz texted: "Well done. Now rest. Tomorrow is a different thing."`,
                vote: {
                  question: 'Zoe is in the main draw. What\'s the right mindset going in?',
                  choices: [
                    { title: 'Play loose — she\'s already beaten expectations', description: 'Every match from here is a bonus. Play free, play her game, enjoy it.' },
                    { title: 'Set a target: reach the quarterfinal', description: 'She needs a concrete goal to stay focused. A quarterfinal run proves she belongs back at this level.' },
                    { title: 'One match at a time, no further', description: 'Focus only on the next match. That\'s always been her best tennis.' },
                  ],
                },
              },
            ],
          },
          {
            title: 'The Main Draw',
            description: 'Expectation is a different kind of opponent.',
            episodes: [
              {
                title: 'Round One',
                body: `Her first-round opponent was seeded sixth. A tall Dane with a serve Zoe had studied for three evenings with Beatriz, and a backhand that could go anywhere.\n\nShe lost the first set 4-6, felt the match settling into a shape she recognised, and won the second on a run of five games that came from somewhere she couldn't have named.\n\nThe third set was an hour and four minutes. She won it 7-5.`,
              },
              {
                title: 'The Body',
                body: `Her knee was fine. That was not the issue. The issue was what lived next to the knee injury in her memory — the way the court had tilted, the specific sound, the eight months afterward when she had not been certain she would return at all.\n\nShe carried this around the tournament grounds and did her best to carry it quietly. Beatriz knew. Her physio Hamid knew. Nobody else needed to.\n\nBefore the second-round match she went through her warm-up and thought about nothing except the ball.`,
              },
              {
                title: 'Her Rival',
                body: `They hadn't played in two years. Before the injury, Zoe was ranked higher. Now the gap had inverted. Meeting her in the quarterfinal was the draw everyone had predicted and nobody had said out loud.\n\nThey hit together the day before. Courteous, professional, no conversation beyond the necessary. Zoe watched her move — still that economy of effort, nothing wasted — and understood this was a different problem than the earlier rounds.\n\nBeatriz said: "You know how she plays. Don't complicate it."`,
              },
              {
                title: 'The Final Set',
                body: `She was down a break in the third set when something shifted. Not tactic, not physio, not anything Beatriz had said. The match had been going one way and then it was going differently, and Zoe had been in the game long enough to know that some things had no useful explanation.\n\nShe broke back. She held. She broke again.\n\nThe crowd had been mostly neutral until this set. They were not neutral now.`,
              },
              {
                title: 'After',
                body: `She won 5-7, 6-3, 6-4. She stood at the net and shook hands and walked to her bench and sat down and looked at the grass.\n\nBeatriz hugged her, which she did very rarely. Her physio gave her an ice pack she didn't need. Three journalists were waiting at the edge of the court.\n\nThe ranking points would update on Monday. She wasn't thinking about that. She was thinking about the first-round qualifying match five days ago on court four — the one she'd had to fight for — and how much longer ago it felt now than it had then.`,
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── users ────────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'superadmin@storyuu.com', firstName: 'Sarah',  lastName: 'Chen',   role: 'superadmin' as const, subscribe: false },
  { email: 'admin@storyuu.com',      firstName: 'Daniel', lastName: 'Osei',   role: 'admin'      as const, subscribe: false },
  { email: 'maya@example.com',       firstName: 'Maya',   lastName: 'Patel',  role: 'reader'     as const, subscribe: true  },
  { email: 'james@example.com',      firstName: 'James',  lastName: 'Okafor', role: 'reader'     as const, subscribe: true  },
  { email: 'guest@example.com',      firstName: 'Alex',   lastName: 'Torres', role: 'reader'     as const, subscribe: false },
];

// ─── seed ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGO_URI!);
  console.log('Connected to MongoDB\n');

  // 1 ── Content
  for (const chDef of CHANNELS) {
    const channel = await Channel.findOneAndUpdate(
      { slug: chDef.slug },
      { $set: { name: chDef.name, description: chDef.description, sortOrder: chDef.sortOrder, coverImageUrl: `https://picsum.photos/seed/${chDef.slug}/800/450`, isPublished: true } },
      { upsert: true, new: true },
    ).lean();
    console.log(`Channel: ${chDef.name}`);

    for (let si = 0; si < chDef.stories.length; si++) {
      const sDef = chDef.stories[si];
      const story = await Story.findOneAndUpdate(
        { slug: sDef.slug },
        { $set: { channelId: channel!._id, title: sDef.title, slug: sDef.slug, overview: sDef.overview, coverImageUrl: `https://picsum.photos/seed/${sDef.slug}/400/600`, status: 'published', publishedAt: new Date() } },
        { upsert: true, new: true },
      ).lean();
      console.log(`  Story: ${sDef.title}`);

      for (let sIdx = 0; sIdx < sDef.seasons.length; sIdx++) {
        const seaDef = sDef.seasons[sIdx];
        const seasonNum = sIdx + 1;
        const season = await Season.findOneAndUpdate(
          { storyId: story!._id, number: seasonNum },
          { $set: { storyId: story!._id, number: seasonNum, title: seaDef.title, description: seaDef.description, status: 'published' } },
          { upsert: true, new: true },
        ).lean();

        for (let eIdx = 0; eIdx < seaDef.episodes.length; eIdx++) {
          const epDef = seaDef.episodes[eIdx];
          const epNum = eIdx + 1;
          const episode = await Episode.findOneAndUpdate(
            { storyId: story!._id, seasonId: season!._id, number: epNum },
            { $set: { storyId: story!._id, seasonId: season!._id, number: epNum, title: epDef.title, body: epDef.body, status: 'published', publishedAt: new Date(Date.now() - (10 - epNum) * 86_400_000), readTimeMinutes: 4 + epNum } },
            { upsert: true, new: true },
          ).lean();

          // VoteQuestion — only on season 1, only if not already linked
          if (epDef.vote && seasonNum === 1 && !episode!.voteQuestionId) {
            // Story index 0 → closed poll (results visible); index 1 → open poll (voting active)
            const isClosed = si === 0;
            const closeAt = isClosed
              ? new Date(Date.now() - 7 * 86_400_000)
              : new Date(Date.now() + 7 * 86_400_000);

            const vq = await VoteQuestion.findOneAndUpdate(
              { episodeId: episode!._id },
              {
                $setOnInsert: {
                  episodeId: episode!._id,
                  question: epDef.vote.question,
                  choices: epDef.vote.choices,
                  openAt: new Date(Date.now() - 14 * 86_400_000),
                  closeAt,
                  winningChoiceIndex: isClosed ? 0 : null,
                  closingSoonNotificationSent: false,
                  resultsNotificationSent: isClosed,
                },
              },
              { upsert: true, new: true },
            ).lean();

            await Episode.updateOne({ _id: episode!._id }, { $set: { voteQuestionId: vq!._id } });
            console.log(`      Vote: "${epDef.vote.question.slice(0, 55)}…"`);
          }
        }
        console.log(`    Season ${seasonNum} "${seaDef.title}": ${seaDef.episodes.length} episodes`);
      }
    }
  }

  // 2 ── Users
  console.log('\nUsers:');
  const passwordHash = await bcrypt.hash('password123', 12);
  let superadminId: mongoose.Types.ObjectId | undefined;

  for (const uDef of USERS) {
    const user = await User.findOneAndUpdate(
      { email: uDef.email },
      { $set: { email: uDef.email, firstName: uDef.firstName, lastName: uDef.lastName, role: uDef.role, passwordHash, isEmailVerified: true } },
      { upsert: true, new: true },
    ).lean();
    if (uDef.role === 'superadmin') superadminId = user!._id;
    console.log(`  ${uDef.email} (${uDef.role})`);
  }

  // 3 ── Subscriptions
  console.log('\nSubscriptions:');
  for (const uDef of USERS.filter((u) => u.subscribe)) {
    const user = await User.findOne({ email: uDef.email }).lean();
    if (!user) continue;
    await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          plan: 'comp',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86_400_000),
          grantedByUserId: superadminId,
          grantReason: 'Seed data — dev/test access',
        },
      },
      { upsert: true, new: true },
    );
    console.log(`  ${uDef.email} → comp/active`);
  }

  console.log('\n── Seed complete ──────────────────────────────────────────');
  console.log('All passwords: password123');
  console.log('  superadmin@storyuu.com  superadmin');
  console.log('  admin@storyuu.com       admin');
  console.log('  maya@example.com        reader  active subscription');
  console.log('  james@example.com       reader  active subscription');
  console.log('  guest@example.com       reader  no subscription (tests content gating)');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
