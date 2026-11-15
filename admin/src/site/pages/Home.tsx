import { BookOpen, CalendarHeart, ChevronDown, Gamepad2, HeartHandshake, Lightbulb, Lock, MapPin, ShieldCheck, Sparkles, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../components/ui'
import { useApi } from '../../lib/hooks'
import type { Paginated } from '../../lib/api'
import type { PublicationSummary } from '../config'
import { PhoneShot, PublicationCard, Reveal, StoreButtons, usePageTitle } from '../ui'

const FEATURES: { id: string; icon: ReactNode; title: string; text: string; points: string[]; shot: string; alt: string; tint: string }[] = [
  {
    id: 'calendrier',
    icon: <CalendarHeart className="size-6" />,
    title: 'Un grand calendrier pour suivre son cycle',
    text: "D'un coup d'œil : les jours de règles, les règles prévues, la période féconde et l'ovulation estimées. Un appui sur un jour ouvre sa fiche.",
    points: ['Prévisions qui s’améliorent avec l’historique', 'Journal : humeur, flux, douleur, symptômes', 'Détection des cycles irréguliers avec un message éducatif'],
    shot: '/site/23-calendrier.jpg',
    alt: "Calendrier du cycle dans l'application Moon",
    tint: 'bg-pink-soft text-[#b8325f]',
  },
  {
    id: 'conseils',
    icon: <Lightbulb className="size-6" />,
    title: 'Quoi faire maintenant ?',
    text: 'Chaque jour, des conseils adaptés à la phase du cycle : alimentation, activité, hygiène, repos, soulagement des douleurs.',
    points: ['Fiches pratiques : serviette, serviette lavable, tampon, cup', 'Signaux à surveiller, avec un message clair : consulter', 'Rappels discrets : règles à venir, changer de protection'],
    shot: '/site/25-fiche-du-jour.jpg',
    alt: 'Fiche du jour avec le conseil du jour',
    tint: 'bg-gold-soft text-[#9a5f0c]',
  },
  {
    id: 'apprendre',
    icon: <BookOpen className="size-6" />,
    title: 'Apprendre sans tabou',
    text: 'Des modules courts et illustrés, validés par des professionnels de santé : comprendre son corps, mythes et réalités, hygiène, santé mentale.',
    points: ['Lecture étape par étape, progression sauvegardée', 'Questions fréquentes avec recherche', 'Mode « Comprendre » pour les garçons et les proches'],
    shot: '/site/30-apprendre.jpg',
    alt: 'Liste des modules éducatifs',
    tint: 'bg-lavender text-purple',
  },
  {
    id: 'jouer',
    icon: <Gamepad2 className="size-6" />,
    title: 'Jouer pour retenir',
    text: 'Quiz, « Mythe ou réalité ? » et jeux d’association : chaque réponse est suivie d’un « À retenir » qui explique.',
    points: ['Points, badges et séries de jours', 'Défi de la semaine', 'Classement facultatif et anonyme'],
    shot: '/site/42-bonne-reponse.jpg',
    alt: 'Bonne réponse dans un quiz Moon',
    tint: 'bg-mint-soft text-[#1f7a4a]',
  },
  {
    id: 'aide',
    icon: <HeartHandshake className="size-6" />,
    title: 'Je suis là pour toi',
    text: "Une question, un souci, un besoin de protections ? Une équipe bienveillante répond dans l'app, même de façon anonyme.",
    points: ['Suivi de la demande : reçue, en cours, traitée', 'Bouton « aide urgente » vers les numéros utiles', 'Réponses publiées dans la FAQ avec accord'],
    shot: '/site/52-conversation.jpg',
    alt: "Conversation avec l'équipe Moon",
    tint: 'bg-pink-soft text-[#b8325f]',
  },
  {
    id: 'centres',
    icon: <MapPin className="size-6" />,
    title: 'Trouver un centre près de chez soi',
    text: 'Centres conseil ados, centres de santé, associations qui distribuent des protections : horaires, distance, appel et itinéraire.',
    points: ['Filtres : ouvert maintenant, gratuit, services, langue', 'Fiches vérifiées par l’équipe', 'Centres de sa région disponibles hors ligne'],
    shot: '/site/55-centres.jpg',
    alt: 'Liste des centres partenaires',
    tint: 'bg-lavender text-purple',
  },
]

const FAQ = [
  ['Moon est-elle gratuite ?', "Oui. L'application est entièrement gratuite, sans publicité."],
  ['À qui s’adresse Moon ?', "Aux adolescentes et jeunes femmes de 12 à 25 ans. Les garçons et les proches peuvent l'utiliser en mode « Comprendre » pour s'informer."],
  ['Mes données sont-elles protégées ?', "Oui. Les données de cycle sont chiffrées, ne sont jamais vendues ni montrées à l'équipe, et chaque utilisatrice peut les exporter ou les supprimer à tout moment. Un code secret peut verrouiller l'app."],
  ['Faut-il Internet pour l’utiliser ?', 'Non, pas tout le temps. Le calendrier, le journal et les jeux fonctionnent hors ligne ; les données se synchronisent au retour du réseau.'],
  ['Moon remplace-t-elle un médecin ?', "Non. Moon informe et sensibilise. En cas de douleurs fortes, de saignements inhabituels ou d'inquiétude, l'app oriente vers un professionnel de santé."],
  ['Sur quels téléphones ?', "Android d'abord (Google Play), puis iPhone (App Store). L'application est pensée pour les smartphones d'entrée de gamme et les réseaux faibles."],
]

export default function Home() {
  usePageTitle('Moon · Ton cycle, sans tabou')
  const pubs = useApi<Paginated<PublicationSummary>>('/public/publications?per_page=3')
  const stats = useApi<{ modules: number; questions: number; games: number; centers: number }>('/public/summary')

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-night via-[#4a2c8f] to-[#7b4fc4] text-white" id="application">
        <Stars />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-bold text-[#e5dbff]">
                <Sparkles className="size-4 text-gold" /> Application gratuite pour les 12-25 ans
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-5 text-5xl leading-[1.05] font-black text-balance md:text-6xl">
                Ton cycle,
                <br />
                <span className="text-gold">sans tabou.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 max-w-xl text-lg text-[#e5dbff]">
                Moon aide les jeunes à suivre leur cycle, à savoir quoi faire à chaque phase, à apprendre en jouant et à trouver de l'aide, en toute confidentialité.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <StoreButtons dark className="mt-8" />
            </Reveal>
          </div>
          <Reveal delay={200} className="relative mx-auto flex w-full max-w-md justify-center">
            <PhoneShot src="/site/01-page-de-garde.jpg" alt="Page de garde de Moon avec les logos des partenaires" className="float-slow w-[44%] -rotate-6" />
            <PhoneShot src="/site/20-accueil.jpg" alt="Accueil de l'application Moon" className="float-fast -ml-6 mt-14 w-[48%] rotate-3" />
          </Reveal>
        </div>
        <a href="#pourquoi" className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 hover:text-white" aria-label="Découvrir">
          <ChevronDown className="size-7 animate-bounce motion-reduce:animate-none" />
        </a>
      </section>

      {/* Partenaires */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-4 py-6 md:px-6">
          <span className="text-sm font-extrabold text-muted">Une initiative soutenue par</span>
          <img src="/site/mjs.png" alt="Ministère de la Jeunesse et des Sports" className="h-12" />
          <img src="/site/unfpa.png" alt="UNFPA" className="h-12" />
          <img src="/site/dpsj.png" alt="Direction de la Protection Sociale des Jeunes" className="h-14" />
        </div>
      </section>

      {/* Pourquoi */}
      <section id="pourquoi" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-black text-balance md:text-4xl">Les règles ne devraient jamais être un secret, ni un obstacle.</h2>
          <p className="mt-4 max-w-3xl text-lg text-muted">
            Manque d'information fiable, gêne à poser des questions, idées reçues, précarité menstruelle : l'hygiène menstruelle reste un sujet tabou qui pèse sur la santé, la confiance en soi et parfois la scolarité. Moon répond simplement, avec bienveillance.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: <ShieldCheck className="size-7" />, title: 'Information fiable', text: 'Contenus rédigés par des éducatrices et validés par des professionnels de santé.' },
            { icon: <HeartHandshake className="size-7" />, title: 'Bienveillance', text: 'Un ton simple, sans jugement, et une équipe qui répond aux questions, même anonymes.' },
            { icon: <Lock className="size-7" />, title: 'Confidentialité', text: 'Données chiffrées, jamais vendues, notifications discrètes et code secret.' },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="h-full rounded-3xl border border-line bg-white p-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-lavender text-purple">{c.icon}</div>
                <h3 className="mt-4 text-xl font-black">{c.title}</h3>
                <p className="mt-2 text-muted">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal>
            <p className="text-sm font-black tracking-widest text-pink uppercase">L'application</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Tout ce qu'il faut, dans la poche.</h2>
          </Reveal>
          <div className="mt-14 space-y-20">
            {FEATURES.map((f, i) => (
              <div key={f.id} id={f.id} className={cx('grid items-center gap-10 md:grid-cols-[1fr_300px]', i % 2 === 1 && 'md:grid-cols-[300px_1fr]')}>
                <Reveal className={cx(i % 2 === 1 && 'md:order-2')}>
                  <div className={cx('inline-flex size-12 items-center justify-center rounded-2xl', f.tint)}>{f.icon}</div>
                  <h3 className="mt-4 text-2xl font-black text-balance md:text-3xl">{f.title}</h3>
                  <p className="mt-3 max-w-xl text-lg text-muted">{f.text}</p>
                  <ul className="mt-5 space-y-2">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex gap-3 font-semibold">
                        <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-pink" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={150} className={cx('mx-auto w-60 md:w-full', i % 2 === 1 && 'md:order-1')}>
                  <PhoneShot src={f.shot} alt={f.alt} />
                </Reveal>
              </div>
            ))}
          </div>
          <Reveal className="mt-20">
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gold-soft p-6">
              <WifiOff className="size-8 text-[#9a5f0c]" />
              <p className="max-w-3xl font-semibold">
                <strong className="font-black">Pensée pour tous les téléphones et tous les réseaux.</strong> Le calendrier, le journal et les jeux fonctionnent sans Internet ; tout se synchronise au retour du réseau.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Reveal>
          <h2 className="text-3xl font-black md:text-4xl">Commencer en trois étapes</h2>
        </Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ['Télécharge Moon', 'Gratuitement sur Google Play, et bientôt sur l’App Store.'],
            ['Crée ton compte', 'Un pseudo, ton âge, un numéro ou un e-mail. Accord d’un parent pour les moins de 18 ans.'],
            ['Suis ton cycle', 'Indique tes dernières règles : Moon t’accompagne chaque jour avec des conseils adaptés.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 100}>
              <li className="h-full list-none rounded-3xl border border-line bg-white p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-night text-lg font-black text-white">{i + 1}</span>
                <h3 className="mt-4 text-xl font-black">{t}</h3>
                <p className="mt-2 text-muted">{d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Chiffres sur les contenus */}
      {stats.data && (
        <section className="bg-night text-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 text-center sm:grid-cols-3 md:px-6">
            {[
              [stats.data.modules, 'modules éducatifs'],
              [stats.data.questions, 'questions de jeux'],
              [stats.data.centers, 'centres partenaires référencés'],
            ].map(([n, l]) => (
              <Reveal key={l as string}>
                <div className="text-5xl font-black text-gold tabular-nums">{n}</div>
                <div className="mt-1 font-bold text-[#e5dbff]">{l}</div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Confidentialité */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-[1fr_280px] md:px-6">
        <Reveal>
          <p className="text-sm font-black tracking-widest text-mint uppercase">Confidentialité</p>
          <h2 className="mt-2 text-3xl font-black text-balance md:text-4xl">Tes données t'appartiennent.</h2>
          <ul className="mt-6 space-y-3 text-lg">
            {[
              'Données de cycle chiffrées, jamais vendues, jamais montrées à l’équipe.',
              'Un pseudo suffit : pas besoin de ton vrai nom.',
              'Notifications discrètes : aucun mot sur les règles sur l’écran.',
              'Code secret ou empreinte pour verrouiller l’app.',
              'Export et suppression de toutes tes données à tout moment.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-6 shrink-0 text-mint" />
                {t}
              </li>
            ))}
          </ul>
          <Link to="/confidentialite" className="mt-6 inline-block font-extrabold text-purple hover:underline">
            Lire la politique de confidentialité →
          </Link>
        </Reveal>
        <Reveal delay={150} className="mx-auto w-56 md:w-full">
          <PhoneShot src="/site/61-confidentialite.jpg" alt="Réglages de confidentialité dans Moon" />
        </Reveal>
      </section>

      {/* Publications */}
      <section className="bg-white py-20" id="publications">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <p className="text-sm font-black tracking-widest text-pink uppercase">Publications</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Actualités, événements et conseils</h2>
            </Reveal>
            <Link to="/publications" className="rounded-full border border-line px-5 py-2.5 font-extrabold hover:bg-lavender-soft">
              Toutes les publications →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pubs.loading && !pubs.data && [0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-lavender-soft" />)}
            {pubs.data?.data.map((p, i) => (
              <Reveal key={p.id} delay={i * 100}>
                <PublicationCard p={p} />
              </Reveal>
            ))}
            {pubs.data && !pubs.data.data.length && <p className="text-muted md:col-span-3">Les premières publications arrivent bientôt.</p>}
            {pubs.error && <p className="text-muted md:col-span-3">Les publications ne peuvent pas être chargées pour le moment.</p>}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <Reveal>
          <h2 className="text-3xl font-black md:text-4xl">Questions fréquentes</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-line bg-white p-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold">
                {q}
                <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Appel final */}
      <section className="px-4 pb-20 md:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#ec5f8c] to-[#7b4fc4] px-6 py-14 text-center text-white md:px-16">
          <Stars count={14} />
          <img src="/site/moon-mark.png" alt="" className="relative mx-auto size-20 rounded-full bg-white p-2" />
          <h2 className="relative mt-5 text-3xl font-black text-balance md:text-4xl">Télécharge Moon et prends soin de toi.</h2>
          <StoreButtons dark className="relative mt-8 justify-center" />
        </div>
      </section>
    </>
  )
}

/** Étoiles scintillantes décoratives (CSS). */
function Stars({ count = 26 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${(i * 53) % 90}%`,
    size: 2 + ((i * 7) % 4),
    delay: `${(i % 7) * 0.4}s`,
  }))
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {stars.map((s, i) => (
        <span key={i} className="twinkle absolute rounded-full bg-gold" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />
      ))}
    </div>
  )
}
