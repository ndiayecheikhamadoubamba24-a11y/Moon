import { useEffect, useState } from 'react'
import { APP_STORE_URL, PLAY_STORE_URL } from '../config'
import { PhoneShot, StoreButtons, usePageTitle } from '../ui'

/**
 * Lien unique à mettre sur les affiches et QR codes : envoie chaque téléphone vers son magasin
 * (Android → Google Play, iPhone → App Store). Sur ordinateur, ou si le lien n'est pas encore configuré,
 * la page affiche les deux boutons.
 */
export default function Download() {
  usePageTitle('Télécharger Moon')
  const [target, setTarget] = useState<'android' | 'ios' | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/i.test(ua)
    const android = /Android/i.test(ua)
    if (android && PLAY_STORE_URL) {
      setTarget('android')
      window.location.replace(PLAY_STORE_URL)
    } else if (ios && APP_STORE_URL) {
      setTarget('ios')
      window.location.replace(APP_STORE_URL)
    }
  }, [])

  return (
    <section className="bg-gradient-to-br from-night via-[#4a2c8f] to-[#7b4fc4] text-white">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 md:grid-cols-[1fr_260px] md:px-6">
        <div>
          <img src="/site/moon-mark.png" alt="" className="size-16 rounded-full bg-white p-2" />
          <h1 className="mt-5 text-4xl font-black md:text-5xl">Télécharger Moon</h1>
          {target ? (
            <p className="mt-4 text-lg text-[#e5dbff]">Ouverture de {target === 'android' ? 'Google Play' : "l'App Store"}…</p>
          ) : (
            <p className="mt-4 max-w-lg text-lg text-[#e5dbff]">Choisis ton magasin d'applications. Moon est gratuite, sans publicité, et fonctionne même avec un réseau faible.</p>
          )}
          <StoreButtons dark className="mt-8" />
          {!PLAY_STORE_URL && !APP_STORE_URL && (
            <p className="mt-6 max-w-lg rounded-2xl bg-white/10 p-4 text-sm text-[#e5dbff]">
              L'application est en cours de publication. Reviens bientôt : ce lien ouvrira directement le bon magasin sur ton téléphone.
            </p>
          )}
          <p className="mt-6 text-sm text-[#cfc2f2]">Android 8 ou plus récent. Version iPhone à venir.</p>
        </div>
        <PhoneShot src="/site/20-accueil.jpg" alt="Accueil de l'application Moon" className="mx-auto w-56 md:w-full" />
      </div>
    </section>
  )
}
