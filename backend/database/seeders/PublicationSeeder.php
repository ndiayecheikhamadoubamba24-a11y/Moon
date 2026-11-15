<?php

namespace Database\Seeders;

use App\Models\Publication;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Publications d'EXEMPLE pour le site vitrine (hors production). */
class PublicationSeeder extends Seeder
{
    public function run(): void
    {
        $author = User::where('email', 'educatrice@moon.test')->value('id');
        $items = [
            [
                'title' => 'Moon arrive : une application pour parler des règles sans tabou',
                'category' => 'actualite',
                'featured' => true,
                'days' => 3,
                'excerpt' => 'Suivre son cycle, apprendre en jouant et trouver de l\'aide : Moon accompagne les jeunes sur l\'hygiène menstruelle.',
                'body' => "Moon est une application mobile gratuite pour les adolescentes et les jeunes femmes de 12 à 25 ans.\n\nElle permet de suivre son cycle avec un grand calendrier, de savoir quoi faire à chaque phase, d'apprendre grâce à des modules courts et à des jeux, et de poser ses questions à une équipe bienveillante, même de façon anonyme.\n\n## Une initiative publique\nMoon est portée par le Ministère de la Jeunesse et des Sports et la Direction de la Protection Sociale des Jeunes, avec le soutien de l'UNFPA.\n\n## Confidentiel par principe\nLes données de cycle sont chiffrées et ne sont jamais montrées à l'équipe. Chaque utilisatrice peut les exporter ou les supprimer à tout moment.",
            ],
            [
                'title' => '28 mai : Journée mondiale de l\'hygiène menstruelle',
                'category' => 'evenement',
                'featured' => false,
                'days' => 10,
                'excerpt' => 'Ateliers, quiz et distribution de protections : rendez-vous dans les centres conseil ados partenaires (exemple).',
                'body' => "Chaque 28 mai, la Journée mondiale de l'hygiène menstruelle rappelle que les règles ne doivent empêcher personne d'aller à l'école, de travailler ou de faire du sport.\n\n## Au programme (exemple)\n- Ateliers « Comprendre mon cycle » dans les centres conseil ados\n- Grand quiz « Mythe ou réalité ? » dans l'application Moon\n- Distribution de protections avec les associations partenaires\n\nLes dates et lieux définitifs seront annoncés dans cette rubrique.",
            ],
            [
                'title' => 'Mythes et réalités : 5 idées reçues sur les règles',
                'category' => 'conseil',
                'featured' => false,
                'days' => 18,
                'excerpt' => 'Peut-on faire du sport ? Se laver ? Cuisiner ? On démêle le vrai du faux.',
                'body' => "Les règles sont un phénomène naturel, mais beaucoup d'idées reçues circulent encore.\n\n## 1. « On ne peut pas faire de sport »\nFaux. Une activité adaptée peut même soulager les crampes.\n\n## 2. « Il ne faut pas se laver »\nFaux. Une toilette à l'eau claire ou au savon doux est importante pour le confort et l'hygiène.\n\n## 3. « Le sang des règles est sale »\nFaux. C'est un processus naturel et sain.\n\n## 4. « Le cycle dure toujours 28 jours »\nFaux. Entre 21 et 35 jours, c'est normal, surtout les premières années.\n\n## 5. « Les garçons n'ont pas besoin de savoir »\nFaux. Comprendre les règles aide tout le monde à briser le tabou.\n\nTeste-toi dans l'onglet Jouer de l'application Moon !",
            ],
            [
                'title' => 'Campagne « Pas de règles qui empêchent d\'aller à l\'école » (exemple)',
                'category' => 'campagne',
                'featured' => false,
                'days' => 30,
                'excerpt' => 'Une campagne de sensibilisation dans les établissements scolaires pour lutter contre la précarité menstruelle.',
                'body' => "La précarité menstruelle fait manquer des journées de classe à de nombreuses jeunes filles.\n\nCette campagne (exemple) associe des séances d'information dans les écoles, la diffusion de l'application Moon et l'orientation vers les centres qui distribuent des protections gratuitement.\n\nDans l'application, l'espace « Je suis là pour toi » permet de faire une demande « Des protections » en toute discrétion.",
            ],
        ];
        foreach ($items as $it) {
            $p = Publication::firstOrNew(['title' => $it['title']]);
            $p->fill([
                'title' => $it['title'], 'category' => $it['category'], 'excerpt' => $it['excerpt'], 'body' => $it['body'],
                'featured' => $it['featured'], 'status' => 'published', 'published_at' => now()->subDays($it['days']),
                'slug' => Str::slug($it['title']),
            ]);
            $p->author_id = $author;
            $p->save();
        }
    }
}
