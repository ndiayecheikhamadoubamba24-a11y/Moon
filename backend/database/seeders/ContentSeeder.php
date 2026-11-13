<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Faq;
use App\Models\Guide;
use App\Models\Module;
use App\Models\Tip;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Contenu éducatif de départ.
 * ⚠️ À faire relire et valider par un professionnel de santé avant publication.
 */
class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect([
            ['name' => 'Comprendre son corps', 'slug' => 'corps-et-cycle', 'icon' => 'body'],
            ['name' => 'Mythes et réalités', 'slug' => 'mythes-realites', 'icon' => 'myth'],
            ['name' => 'Hygiène', 'slug' => 'hygiene', 'icon' => 'hygiene'],
            ['name' => 'Alimentation', 'slug' => 'alimentation', 'icon' => 'food'],
            ['name' => 'Santé mentale', 'slug' => 'sante-mentale', 'icon' => 'mind'],
            ['name' => 'Précarité menstruelle', 'slug' => 'precarite', 'icon' => 'heart'],
            ['name' => 'Bonnes pratiques', 'slug' => 'bonnes-pratiques', 'icon' => 'star'],
        ])->mapWithKeys(fn ($c, $i) => [$c['slug'] => Category::updateOrCreate(['slug' => $c['slug']], [...$c, 'position' => $i])]);

        $tips = [
            // Règles
            ['menstrual', 'hydratation', 'Hydratation', 'Bois de l\'eau régulièrement, cela aide à réduire la fatigue et les maux de tête.', 'water'],
            ['menstrual', 'douleur', 'Soulagement', 'Une bouillotte tiède sur le ventre peut soulager les crampes.', 'hot-water-bottle'],
            ['menstrual', 'repos', 'Confort', 'Repose-toi si tu en as besoin : ton corps travaille beaucoup en ce moment.', 'pillow'],
            ['menstrual', 'hygiene', 'Hygiène', 'Change ta serviette ou ton tampon toutes les 4 à 6 heures, même si le flux est léger.', 'pad'],
            ['menstrual', 'alimentation', 'Alimentation', 'Mange des aliments riches en fer (légumes verts, lentilles, poisson) pour compenser les pertes.', 'apple'],
            ['menstrual', 'activite', 'Activité', 'Une marche ou des étirements doux peuvent diminuer les douleurs.', 'shoe'],
            // Phase folliculaire
            ['follicular', 'alimentation', 'Alimentation', 'Mange des aliments riches en fer (légumes verts, légumineuses).', 'apple'],
            ['follicular', 'activite', 'Activité', 'Ton énergie remonte : c\'est un bon moment pour bouger, danser ou faire du sport.', 'shoe'],
            ['follicular', 'hygiene', 'Hygiène', 'Lave la zone intime à l\'eau claire ou avec un savon doux, sans douche vaginale.', 'drop'],
            ['follicular', 'hydratation', 'Hydratation', 'Bois beaucoup d\'eau pour rester en bonne santé !', 'water'],
            // Ovulation
            ['ovulation', 'bien_etre', 'Bien-être', 'Tu peux remarquer des pertes blanches plus fluides : c\'est normal à ce moment du cycle.', 'sparkle'],
            ['ovulation', 'activite', 'Activité', 'Tu te sens peut-être pleine d\'énergie : profite-en pour une activité que tu aimes.', 'shoe'],
            ['ovulation', 'alimentation', 'Alimentation', 'Fruits, légumes et céréales complètes t\'aident à garder une énergie stable.', 'apple'],
            // Phase lutéale
            ['luteal', 'alimentation', 'Alimentation', 'Envie de sucré ? Essaie une banane, des dattes ou des arachides.', 'banana'],
            ['luteal', 'repos', 'Sommeil', 'Dors suffisamment : la fatigue et l\'irritabilité peuvent augmenter avant les règles.', 'moon'],
            ['luteal', 'hygiene', 'Préparation', 'Prépare une protection dans ton sac : tes règles approchent.', 'bag'],
            ['luteal', 'bien_etre', 'Humeur', 'Si tu te sens triste ou irritable, c\'est fréquent avant les règles. Parle à quelqu\'un de confiance.', 'heart'],
            ['luteal', 'hydratation', 'Hydratation', 'Boire de l\'eau et limiter le sel aide à réduire les ballonnements.', 'water'],
        ];
        foreach ($tips as [$phase, $topic, $title, $body, $icon]) {
            Tip::updateOrCreate(['phase' => $phase, 'topic' => $topic, 'title' => $title], ['body' => $body, 'icon' => $icon]);
        }

        $guides = [
            ['practical', 'Utiliser et changer une serviette', 'serviette', "1. Lave-toi les mains.\n2. Retire le papier et colle la serviette au fond de ta culotte.\n3. Change-la toutes les 4 à 6 heures.\n4. Enroule la serviette usagée dans son emballage ou du papier et jette-la à la poubelle (jamais dans les toilettes)."],
            ['practical', 'Utiliser une serviette lavable', 'serviette-lavable', "Rince-la à l'eau froide, lave-la au savon et fais-la sécher au soleil : le soleil aide à éliminer les microbes. Elle doit être bien sèche avant d'être réutilisée."],
            ['practical', 'Utiliser un tampon', 'tampon', 'Lave-toi les mains, insère le tampon en suivant la notice, et change-le au maximum toutes les 4 à 8 heures. Ne le garde jamais toute la nuit plus de 8 heures.'],
            ['practical', 'Utiliser une coupe menstruelle (cup)', 'cup', "Plie la coupe, insère-la, puis vide-la toutes les 4 à 8 heures (12 h max). Rince-la à l'eau, et stérilise-la dans l'eau bouillante entre deux cycles."],
            ['practical', 'Hygiène intime', 'hygiene-intime', "Une toilette par jour à l'eau claire ou au savon doux suffit, de l'avant vers l'arrière. Évite les douches vaginales et les produits parfumés qui irritent."],
            ['practical', 'Fuite imprévue : pas de panique', 'fuite-imprevue', "Ça arrive à tout le monde ! Noue un pull autour de ta taille, demande une protection à une amie ou à l'infirmerie, et rince le tissu à l'eau froide dès que possible."],
            ['alert', 'Douleurs très fortes', 'douleurs-fortes', "Si tes douleurs t'empêchent d'aller à l'école ou ne passent pas avec du repos et de la chaleur, consulte un professionnel de santé."],
            ['alert', 'Saignements anormaux', 'saignements-anormaux', 'Des règles qui durent plus de 7 jours, qui obligent à changer de protection toutes les heures, ou des saignements entre les règles : consulte un professionnel de santé.'],
            ['alert', 'Cycles très irréguliers', 'cycles-irreguliers', 'Pas de règles pendant plus de 3 mois, ou des cycles de moins de 21 jours qui se répètent : parles-en à un professionnel de santé.'],
        ];
        foreach ($guides as [$kind, $title, $slug, $body]) {
            Guide::updateOrCreate(['slug' => $slug], ['kind' => $kind, 'title' => $title, 'body' => $body]);
        }

        $modules = [
            ['corps-et-cycle', 'Comprendre mon cycle', 'Les 4 phases du cycle expliquées simplement.', 3, [
                ['text', 'Qu\'est-ce que le cycle ?', 'Le cycle menstruel commence le premier jour des règles et se termine la veille des règles suivantes. Il dure en moyenne 28 jours, mais entre 21 et 35 jours, c\'est normal.'],
                ['text', 'Les 4 phases', "1. Les règles : la muqueuse de l'utérus s'élimine.\n2. La phase folliculaire : l'énergie remonte.\n3. L'ovulation : l'ovaire libère un ovule.\n4. La phase lutéale : le corps se prépare aux prochaines règles."],
                ['text', 'À retenir', 'Chaque corps est différent. Noter ses règles dans Moon aide à mieux connaître son propre cycle.'],
            ]],
            ['hygiene', 'Les bons gestes d\'hygiène', 'Choisir et changer sa protection, prendre soin de soi.', 4, [
                ['text', 'Les protections', 'Serviettes jetables ou lavables, tampons, coupes menstruelles : chaque protection a ses avantages. L\'important est de la changer régulièrement.'],
                ['text', 'Toutes les combien ?', 'Serviette : toutes les 4 à 6 h. Tampon : 4 à 8 h maximum. Coupe : 4 à 8 h (12 h maximum).'],
                ['text', 'Se laver', 'Une toilette par jour à l\'eau claire ou au savon doux suffit. Évite les produits parfumés.'],
            ]],
            ['mythes-realites', 'Mythes et réalités sur les règles', 'Démêler le vrai du faux.', 3, [
                ['text', 'Mythe : on ne peut pas se laver pendant les règles', 'Faux ! Se laver est important pour se sentir bien et éviter les infections.'],
                ['text', 'Mythe : le sport est interdit', 'Faux ! Une activité adaptée peut même soulager les crampes.'],
                ['text', 'Mythe : les règles sont sales', 'Faux ! Le sang des règles n\'est pas sale : c\'est un processus naturel et sain.'],
            ]],
            ['sante-mentale', 'Humeur et règles', 'Pourquoi mon humeur change pendant le cycle ?', 3, [
                ['text', 'Les hormones', 'Les hormones varient pendant le cycle et peuvent influencer l\'humeur, l\'énergie et le sommeil.'],
                ['text', 'Prendre soin de soi', 'Dormir, bouger, parler à quelqu\'un de confiance : de petits gestes qui aident. Si la tristesse dure, demande de l\'aide dans l\'espace « Je suis là pour toi ».'],
            ]],
        ];
        foreach ($modules as [$cat, $title, $summary, $minutes, $sections]) {
            $module = Module::updateOrCreate(['slug' => Str::slug($title)], [
                'title' => $title, 'summary' => $summary, 'duration_minutes' => $minutes,
                'category_id' => $categories[$cat]->id,
            ]);
            $module->forceFill(['status' => 'published', 'published_at' => $module->published_at ?? now()])->save();
            $module->sections()->delete();
            foreach ($sections as $i => [$type, $stitle, $body]) {
                $module->sections()->create(['type' => $type, 'title' => $stitle, 'body' => $body, 'position' => $i]);
            }
        }

        $faqs = [
            ['corps-et-cycle', 'À quel âge arrivent les premières règles ?', 'En général entre 9 et 16 ans. Si tu n\'as pas eu tes règles à 16 ans, parles-en à un professionnel de santé.'],
            ['corps-et-cycle', 'Est-ce normal que mes cycles soient irréguliers ?', 'Oui, surtout les 2 premières années après les premières règles. Le cycle se régularise souvent avec le temps.'],
            ['hygiene', 'Combien de temps garder une serviette ?', '4 à 6 heures en général, à adapter selon ton flux.'],
            ['mythes-realites', 'Peut-on se baigner pendant les règles ?', 'Oui, avec un tampon ou une coupe menstruelle. Avec une serviette, la baignade n\'est pas possible.'],
            ['precarite', 'Je n\'ai pas les moyens d\'acheter des protections, que faire ?', 'Fais une demande « besoin de protections » dans l\'espace d\'aide, ou consulte la carte pour trouver un centre qui en distribue gratuitement.'],
        ];
        foreach ($faqs as [$cat, $q, $a]) {
            Faq::updateOrCreate(['question' => $q], ['answer' => $a, 'category_id' => $categories[$cat]->id]);
        }
    }
}
