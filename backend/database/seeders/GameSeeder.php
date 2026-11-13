<?php

namespace Database\Seeders;

use App\Models\Badge;
use App\Models\Challenge;
use App\Models\Game;
use Illuminate\Database\Seeder;

class GameSeeder extends Seeder
{
    public function run(): void
    {
        $quiz = Game::updateOrCreate(['type' => 'quiz', 'title' => 'Quiz'], [
            'description' => 'Teste tes connaissances sur le cycle et l\'hygiène.', 'duration_minutes' => 3,
        ]);
        $q = fn (string $a, string $b, string $c, string $d) => [
            ['key' => 'A', 'label' => $a], ['key' => 'B', 'label' => $b], ['key' => 'C', 'label' => $c], ['key' => 'D', 'label' => $d],
        ];
        $quizQuestions = [
            ['Corps et cycle', 'Peut-on faire du sport pendant les règles ?', $q('Oui, sans problème !', 'Oui, mais seulement le sport doux', 'Non, jamais', 'Seulement après la fin des règles'), 'A',
                'Le sport peut soulager les crampes et te faire du bien. Écoute ton corps et adapte l\'intensité.', 'Pense à ce qui aide à détendre les muscles…'],
            ['Corps et cycle', 'Combien de temps dure un cycle en moyenne ?', $q('7 jours', '14 jours', '28 jours', '60 jours'), 'C',
                'En moyenne 28 jours, mais entre 21 et 35 jours c\'est normal.', 'C\'est environ un mois.'],
            ['Hygiène', 'Toutes les combien changer une serviette ?', $q('Une fois par jour', 'Toutes les 4 à 6 heures', 'Une fois par semaine', 'Seulement quand elle déborde'), 'B',
                'Change-la toutes les 4 à 6 heures pour éviter les odeurs et les infections.', 'Plusieurs fois par jour.'],
            ['Corps et cycle', 'Que se passe-t-il pendant l\'ovulation ?', $q('L\'utérus saigne', 'L\'ovaire libère un ovule', 'Le cycle s\'arrête', 'Rien de spécial'), 'B',
                'Pendant l\'ovulation, un ovaire libère un ovule, environ 14 jours avant les règles suivantes.', 'Cela concerne les ovaires.'],
            ['Hygiène', 'Comment laver la zone intime ?', $q('Avec un savon parfumé', 'Avec une douche vaginale', 'À l\'eau claire ou avec un savon doux', 'Il ne faut pas la laver'), 'C',
                'L\'eau claire ou un savon doux suffisent. Les produits parfumés et les douches vaginales irritent.', 'Le plus simple est le mieux.'],
            ['Alimentation', 'Quels aliments aident à compenser la perte de fer ?', $q('Les sodas', 'Les légumes verts et les lentilles', 'Les bonbons', 'Le café'), 'B',
                'Légumes verts, lentilles, haricots, poisson et viande sont riches en fer.', 'Pense aux plats avec des feuilles vertes.'],
            ['Santé', 'Quand faut-il consulter un professionnel de santé ?', $q('Si les douleurs empêchent d\'aller à l\'école', 'Jamais', 'Seulement après 30 ans', 'Si les règles durent 4 jours'), 'A',
                'Des douleurs très fortes, des règles très longues ou très abondantes doivent être vues par un professionnel.', 'Quand la douleur gêne ta vie quotidienne.'],
            ['Corps et cycle', 'Les premières années, les cycles peuvent-ils être irréguliers ?', $q('Non, jamais', 'Oui, c\'est fréquent', 'Seulement chez les garçons', 'Seulement en saison des pluies'), 'B',
                'Les 2 premières années, le cycle se met en place et peut être irrégulier.', 'Le corps apprend…'],
            ['Hygiène', 'Où jeter une serviette jetable usagée ?', $q('Dans les toilettes', 'Dans la poubelle, enroulée', 'Dans la rue', 'Dans le lavabo'), 'B',
                'Enroule-la dans son emballage ou du papier et jette-la à la poubelle. Jamais dans les toilettes : elle les boucherait.', 'Pas dans l\'eau.'],
            ['Bien-être', 'Qu\'est-ce qui peut soulager les crampes ?', $q('Une bouillotte tiède sur le ventre', 'Rester immobile toute la journée', 'Boire moins d\'eau', 'Sauter des repas'), 'A',
                'La chaleur détend les muscles de l\'utérus. Une marche douce et l\'hydratation aident aussi.', 'Pense à la chaleur.'],
        ];
        $this->questions($quiz, $quizQuestions, fn ($row) => [
            'topic' => $row[0], 'prompt' => $row[1], 'options' => $row[2], 'answer' => $row[3], 'explanation' => $row[4], 'hint' => $row[5],
        ]);

        $myth = Game::updateOrCreate(['type' => 'myth_fact', 'title' => 'Mythe ou réalité ?'], [
            'description' => 'Glisse la carte ou choisis une réponse.', 'duration_minutes' => 2,
        ]);
        $this->questions($myth, [
            ['On ne peut pas faire de sport pendant les règles.', 'myth', 'Le sport est possible et peut même soulager les douleurs.'],
            ['Les règles sont un phénomène naturel et sain.', 'fact', 'Les règles montrent que le corps fonctionne normalement.'],
            ['Il ne faut pas se laver pendant les règles.', 'myth', 'Se laver est important pour l\'hygiène et le confort.'],
            ['On peut tomber enceinte même pendant les règles.', 'fact', 'C\'est moins probable, mais possible, surtout avec des cycles courts.'],
            ['Une fille qui a ses règles ne doit pas cuisiner.', 'myth', 'Aucune raison : les règles ne rendent pas la nourriture impure.'],
            ['Des cycles irréguliers sont fréquents à l\'adolescence.', 'fact', 'Le cycle met souvent 1 à 2 ans à se régulariser.'],
            ['Le sang des règles est sale.', 'myth', 'Ce sang n\'est pas sale ; il contient du sang et des tissus de l\'utérus.'],
            ['Le stress peut retarder les règles.', 'fact', 'Le stress, la fatigue ou un changement de rythme peuvent décaler le cycle.'],
            ['Les garçons n\'ont pas besoin de savoir ce que sont les règles.', 'myth', 'Tout le monde gagne à comprendre les règles pour briser le tabou.'],
            ['Boire de l\'eau aide à réduire les ballonnements.', 'fact', 'Bien s\'hydrater aide le corps à moins retenir l\'eau.'],
        ], fn ($row) => ['topic' => 'Mythes et réalités', 'prompt' => $row[0], 'options' => null, 'answer' => $row[1], 'explanation' => $row[2]]);

        $assoc = Game::updateOrCreate(['type' => 'association', 'title' => 'Association'], [
            'description' => 'Relie chaque terme à sa bonne définition.', 'duration_minutes' => 3,
        ]);
        $this->questions($assoc, [
            [['Phase lutéale', 'Serviette lavable', 'Ovulation'], ['Phase après l\'ovulation', 'Une protection réutilisable', 'Période où l\'ovaire libère un ovule'], ['0' => 0, '1' => 1, '2' => 2]],
            [['Règles', 'Phase folliculaire', 'Cup'], ['Élimination de la muqueuse de l\'utérus', 'L\'énergie remonte, un follicule mûrit', 'Coupe en silicone réutilisable'], ['0' => 0, '1' => 1, '2' => 2]],
        ], fn ($row) => ['topic' => 'Corps et cycle', 'prompt' => 'Relie chaque terme à sa bonne définition', 'options' => ['left' => $row[0], 'right' => $row[1]], 'answer' => $row[2]]);

        $badges = [
            ['first_step', 'Première étape', 'Joue ta première partie', 'star', ['type' => 'games_played', 'value' => 1]],
            ['curious', 'Curieuse', 'Termine ton premier module', 'heart', ['type' => 'modules_completed', 'value' => 1]],
            ['myth_expert', 'Experte des mythes', 'Réponds juste à 20 questions', 'trophy', ['type' => 'correct_answers', 'value' => 20]],
            ['streak_7', 'Série de 7 jours', 'Joue pendant 7 jours', 'flame', ['type' => 'streak', 'value' => 7]],
            ['perfect', 'Sans faute', 'Obtiens un score parfait', 'crown', ['type' => 'perfect_score', 'value' => 1]],
            ['learner', 'Bonne élève', 'Termine 3 modules', 'book', ['type' => 'modules_completed', 'value' => 3]],
        ];
        foreach ($badges as [$code, $name, $desc, $icon, $criteria]) {
            Badge::updateOrCreate(['code' => $code], ['name' => $name, 'description' => $desc, 'icon' => $icon, 'criteria' => $criteria]);
        }

        Challenge::updateOrCreate(['title' => 'Expert des mythes'], [
            'description' => '5 bonnes réponses d\'affilée',
            'goal' => ['type' => 'correct_streak', 'value' => 5, 'game_type' => 'myth_fact'],
            'reward_points' => 50,
            'starts_on' => now()->startOfWeek()->toDateString(),
            'ends_on' => now()->endOfWeek()->toDateString(),
        ]);
    }

    private function questions(Game $game, array $rows, callable $map): void
    {
        $game->questions()->delete();
        foreach ($rows as $i => $row) {
            $game->questions()->create([...$map($row), 'position' => $i]);
        }
    }
}
