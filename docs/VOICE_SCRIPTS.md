# Voice generation scripts

Generate one file per line using the exact filename shown. Keep each clip dry: no music, no crowd, no reverb baked in. The game will mix it with stadium ambience.

## Female PA announcer

Voice direction: adult female stadium PA announcer; clear, professional, composed, slightly projected, neutral American accent, realistic college track meet cadence.

- `venue_welcome_01.mp3` — "Good evening, and welcome to Hawthorne University Track Stadium for tonight's NCFA collegiate track and field meet."
- `venue_welcome_02.mp3` — "Welcome to Hawthorne University. Athletes and spectators, please remain clear of the track and competition areas."
- `first_call_01.mp3` — "First call for the upcoming track event. Competitors, please report to the clerking area."
- `second_call_01.mp3` — "Second call. Competitors in the next track event should report to the clerking area now."
- `final_call_01.mp3` — "Final call. Athletes not checked in should report immediately."
- `event_100m_01.mp3` — "Now on the track, the men's one hundred metres."
- `event_200m_01.mp3` — "Now on the track, the men's two hundred metres."
- `event_400m_01.mp3` — "Now on the track, the men's four hundred metres."
- `event_800m_01.mp3` — "Now on the track, the men's eight hundred metres."
- `event_1500m_01.mp3` — "Now on the track, the men's fifteen hundred metres."
- `event_3000m_01.mp3` — "Now on the track, the men's three thousand metres."
- `event_5000m_01.mp3` — "Now on the track, the men's five thousand metres."
- `event_10000m_01.mp3` — "Now on the track, the men's ten thousand metres."
- `field_events_01.mp3` — "Field events are continuing across the infield. Please watch for officials and active competition areas."
- `results_posted_01.mp3` — "Official results have been posted."
- `record_alert_01.mp3` — "Attention, please. That performance is a new meet record."

## Female broadcast commentator

Voice direction: adult female television track commentator; knowledgeable, conversational, energetic without shouting, natural live-broadcast timing.

- `race_open_01.mp3` — "This field has plenty of speed, but the question is who can stay composed once the pace starts changing."
- `race_open_02.mp3` — "Watch the positioning early. In a race like this, losing one step at the wrong time can change everything."
- `waterfall_01.mp3` — "They're starting from the waterfall, so space at the rail is going to disappear very quickly."
- `one_turn_01.mp3` — "One-turn stagger tonight. They'll stay in lanes through the opening bend before cutting for the rail."
- `pace_fast_01.mp3` — "This is quick. They're committing early, and somebody is going to have to pay for this pace later."
- `pace_controlled_01.mp3` — "Very controlled through the opening stages. Everybody still has options right now."
- `move_up_01.mp3` — "Here comes the move. That's a decisive change in position."
- `boxed_01.mp3` — "There's nowhere to go on the inside. The athlete is completely boxed at the moment."
- `bell_01.mp3` — "The bell is ringing. One lap to go, and now the race really starts."
- `final_stretch_01.mp3` — "They're into the straight. Everybody is reaching for whatever they have left."
- `player_win_01.mp3` — "What a race! The Hawthorne athlete gets there first and takes the win!"
- `player_mid_01.mp3` — "A solid finish, but not quite enough to get into the fight at the very front today."
- `player_loss_01.mp3` — "That one got away from Hawthorne. A difficult race, and they'll have plenty to review afterward."
- `player_pr_01.mp3` — "The place may not tell the whole story. That's a personal best, and a major step forward."
- `upset_01.mp3` — "That is an upset. The form chart is out the window tonight."

## Male broadcast commentator

Voice direction: adult male television track commentator; analytical, natural, excited only when the race earns it, realistic American collegiate sports broadcast.

- `race_open_01.mp3` — "We're set for a strong field here, and there isn't much separating these athletes on paper."
- `race_open_02.mp3` — "This could be tactical, or somebody could decide to make it honest from the gun. We'll find out quickly."
- `waterfall_01.mp3` — "Waterfall start here. They'll all be fighting for clean position before the first turn settles down."
- `one_turn_01.mp3` — "They'll use a one-turn stagger, stay in their assigned lanes through the first bend, then break toward the inside."
- `first_200_01.mp3` — "Through two hundred, they're moving well. Nobody wants to get stranded too far off the front."
- `halfway_01.mp3` — "Halfway now, and this is where the race starts asking real questions."
- `move_up_01.mp3` — "A big move on the outside. That's not free, but it puts the athlete right back into contention."
- `leader_pressing_01.mp3` — "The leader is pressing the pace. The field is beginning to stretch behind."
- `bell_01.mp3` — "Bell lap. Four hundred metres left, and it's time to go."
- `kick_01.mp3` — "There's the kick! A huge change of gears with the finish getting closer."
- `final_stretch_01.mp3` — "Down the home straight they come! This is going all the way to the line!"
- `player_win_01.mp3` — "Hawthorne wins it! A tremendous finish and a huge result in front of the home crowd!"
- `player_mid_01.mp3` — "Middle of the pack at the line. Competitive, but there was another level required in this field."
- `player_loss_01.mp3` — "A rough one today. The field simply had too much, and Hawthorne comes home well back."
- `player_pr_01.mp3` — "Put a star beside that time. It's a new personal best."
- `big_pr_01.mp3` — "That is a massive personal best. Forget the seed time; this athlete just changed the conversation."

## Officials / starter

Voice direction: adult meet official, calm and authoritative. Record each command alone with silence before and after it. No crowd or effects.

- `on_your_marks_standing_01.mp3` — "On your marks."
- `on_your_marks_blocks_01.mp3` — "On your marks."
- `set_01.mp3` — "Set."
- `stand_up_01.mp3` — "Stand up, please."
- `false_start_01.mp3` — "False start. Athletes, return to your marks."
- `recall_01.mp3` — "Recall. Return to the starting line."
- `waterfall_instructions_01.mp3` — "Waterfall start. Hold your position behind the line until called to your marks."
- `one_turn_instructions_01.mp3` — "One-turn stagger. Remain in your assigned lane through the first turn. Break for the inside after the marked break line."
- `lane_instructions_01.mp3` — "Remain in your assigned lane for the entire race."
- `pace_assignment_01.mp3` — "Your assignment is to lead through the requested distance and keep the pace controlled for the field."
- `pace_drop_01.mp3` — "Pace assignment complete. Step off safely when directed by your coach."

## Timing rule for the game

Standing-start distance races: play `on_your_marks_standing_01.mp3`, then use a randomized silent hold before the gun. Do not play `set_01.mp3`.

Block-start sprint races: play `on_your_marks_blocks_01.mp3`, randomized pause, play `set_01.mp3`, randomized pause, then fire the gun.

The random hold prevents every race start from feeling scripted.
