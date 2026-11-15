import { CONTACT_EMAIL } from '../config'
import { usePageTitle } from '../ui'

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Qui sommes-nous ?',
    body: [
      "Moon est une application de sensibilisation et d'accompagnement des jeunes sur l'hygiène menstruelle, portée par le Ministère de la Jeunesse et des Sports et la Direction de la Protection Sociale des Jeunes, avec le soutien de l'UNFPA.",
      'Le responsable du traitement des données est l’organisme porteur du projet. Contact : ' + CONTACT_EMAIL + '.',
    ],
  },
  {
    title: 'Quelles données collectons-nous ?',
    body: [
      'Profil minimal : prénom ou pseudo, avatar, tranche d’âge, langue, et un numéro de téléphone ou une adresse e-mail pour se connecter.',
      'Données de cycle et de bien-être, saisies volontairement : dates de règles, humeur, flux, douleur, symptômes et notes du journal.',
      'Utilisation de l’app : progression dans les modules, scores des jeux, badges, demandes d’aide et messages échangés avec l’équipe.',
      'La position n’est utilisée que sur le téléphone, au moment de chercher un centre proche : elle n’est jamais enregistrée ni envoyée à nos serveurs.',
    ],
  },
  {
    title: 'Pourquoi ces données ?',
    body: [
      'Calculer les prévisions du cycle, proposer des conseils adaptés, envoyer les rappels choisis, répondre aux demandes d’aide et améliorer les contenus.',
      'Des statistiques strictement anonymes et agrégées (par tranche d’âge ou région, groupes de moins de 5 personnes masqués) servent à piloter le projet.',
      'Nous ne vendons aucune donnée et n’affichons aucune publicité.',
    ],
  },
  {
    title: 'Fatou, l’assistante virtuelle',
    body: [
      'Fatou est une assistante virtuelle dont les réponses sont écrites par une intelligence artificielle. Son utilisation est facultative et demande ton accord à la première ouverture.',
      'Pour te répondre, tes messages à Fatou, ton pseudo et ta tranche d’âge sont envoyés à un service d’IA externe (Groq, ou Google Gemini en secours). Moon n’enregistre pas ces conversations. Ces services les traitent selon leurs propres conditions.',
      'N’écris pas d’informations qui permettent de t’identifier (nom complet, adresse, numéro). Fatou ne remplace pas un professionnel de santé.',
    ],
  },
  {
    title: 'Consentement et mineures',
    body: [
      'Le consentement est demandé à l’inscription. Pour les moins de 18 ans, l’accord d’un parent ou d’un tuteur est requis.',
      'Le consentement peut être retiré à tout moment en supprimant le compte.',
    ],
  },
  {
    title: 'Qui peut voir tes données ?',
    body: [
      'Les données de cycle et le journal ne sont visibles que par toi. Les notes du journal sont chiffrées.',
      'L’équipe Moon ne voit ni ton cycle, ni ton journal, ni ton numéro ou ton e-mail. Dans le back-office, chaque compte est identifié par un pseudo et une référence anonyme.',
      'Les demandes d’aide sont lues par les responsables d’accompagnement. Une demande anonyme ne montre pas ton pseudo.',
      'Toutes les actions de l’équipe sont enregistrées dans un journal d’audit.',
    ],
  },
  {
    title: 'Sécurité',
    body: [
      'Connexions chiffrées (HTTPS), accès limité par rôle, mot de passe protégé, code secret ou biométrie disponibles dans l’app, notifications discrètes par défaut.',
    ],
  },
  {
    title: 'Combien de temps ?',
    body: [
      'Tes données sont conservées tant que ton compte existe.',
      'La suppression du compte efface définitivement le profil, les cycles, le journal, les scores et les demandes.',
    ],
  },
  {
    title: 'Tes droits',
    body: [
      'Conformément à la loi sénégalaise sur la protection des données personnelles, tu peux accéder à tes données, les corriger, les exporter et les supprimer.',
      'Dans l’app : Profil → Exporter mes données ; Profil → Supprimer mon compte. Tu peux aussi écrire à ' + CONTACT_EMAIL + '.',
      'Tu peux saisir la Commission de Protection des Données Personnelles (CDP) si tu estimes que tes droits ne sont pas respectés.',
    ],
  },
]

export default function Privacy() {
  usePageTitle('Politique de confidentialité · Moon')
  return (
    <>
      <section className="bg-gradient-to-br from-night to-[#4a2c8f] text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
          <h1 className="text-4xl font-black md:text-5xl">Politique de confidentialité</h1>
          <p className="mt-3 text-lg text-[#e5dbff]">Ce que Moon fait de tes données, expliqué simplement.</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <p className="rounded-2xl bg-gold-soft p-4 text-sm font-semibold">Version de travail du 15 novembre 2026, à valider par un juriste avant la mise en ligne de l'application.</p>
        <div className="mt-8 space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={s.title}>
              <h2 className="text-2xl font-black">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-[17px] leading-relaxed">
                {s.body.map((b) => (
                  <p key={b}>{b}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
