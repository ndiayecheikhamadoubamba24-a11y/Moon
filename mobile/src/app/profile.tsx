import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Share, Switch, TextInput, View } from 'react-native';
import { PartnersStrip } from '../components/Brand';
import { NightHeader } from '../components/Header';
import { Button, Card, Disclaimer, Field, Screen, SectionTitle, Segmented, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLock } from '../context/LockContext';
import { api, errorMessage } from '../lib/api';
import { AVATARS } from '../lib/constants';
import { useApi } from '../lib/hooks';
import { registerForPush } from '../lib/notifications';
import { colors, space } from '../lib/theme';

type Reminder = { type: string; enabled: boolean };
const REMINDER_LABELS: Record<string, string> = {
  period_soon: 'Prévenir 2 jours avant mes règles',
  change_protection: 'Changer de protection (pendant les règles)',
  hydration: "Penser à boire de l'eau",
  daily_log: 'Noter ma journée le soir',
};

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const lock = useLock();
  const reminders = useApi<Reminder[]>('/reminders');
  const [name, setName] = useState(user?.name ?? '');
  const [pinModal, setPinModal] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;
  const discreet = user.notification_settings?.discreet ?? true;

  const save = async (patch: Record<string, unknown>) => {
    try {
      await updateUser(patch);
      setMessage('Enregistré ✓');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) {
      setMessage(errorMessage(e));
    }
  };

  const toggleReminder = async (type: string, enabled: boolean) => {
    if (enabled) await registerForPush();
    await api(`/reminders/${type}`, { method: 'PUT', body: { enabled } }).catch(() => {});
    reminders.reload();
  };

  const exportData = async () => {
    try {
      const data = await api('/me/export');
      await Share.share({ title: 'Mes données Moon', message: JSON.stringify(data, null, 2) });
    } catch (e) {
      Alert.alert('Export impossible', errorMessage(e));
    }
  };

  const deleteAccount = () =>
    Alert.alert('Supprimer mon compte ?', 'Toutes tes données (cycles, journal, scores, demandes) seront définitivement effacées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/me', { method: 'DELETE' });
            await signOut();
          } catch (e) {
            Alert.alert('Erreur', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Mon profil" subtitle={`⭐ ${user.points} pts · 🔥 ${user.streak_days} jours`} back />
      <Screen edges={['bottom']}>
        <Card style={{ marginBottom: space.md }}>
          <T weight="bold" size={14} style={{ marginBottom: space.sm }}>
            Mon avatar
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {AVATARS.map((a) => (
              <Pressable
                key={a}
                onPress={() => save({ avatar: a })}
                accessibilityLabel={`Avatar ${a}`}
                style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: user.avatar === a ? colors.purple : colors.border, backgroundColor: user.avatar === a ? colors.lavender : colors.white }}
              >
                <T size={24}>{a}</T>
              </Pressable>
            ))}
          </View>
        </Card>
        <Card>
          <Field label="Prénom ou pseudo" value={name} onChangeText={setName} onEndEditing={() => name.trim() && name !== user.name && save({ name: name.trim() })} />
          <T weight="bold" size={14} style={{ marginBottom: 6 }}>
            Mon usage de Moon
          </T>
          <Segmented
            options={[
              { value: 'suivi', label: 'Suivre mon cycle' },
              { value: 'comprendre', label: 'Comprendre' },
            ]}
            value={user.mode}
            onChange={(v) => save({ mode: v })}
          />
          <T size={12} color={colors.textMuted} style={{ marginTop: 6 }}>
            Le mode « Comprendre » est fait pour les garçons et les proches qui veulent s'informer.
          </T>
          {message ? (
            <T size={13} color={colors.green} style={{ marginTop: 6 }}>
              {message}
            </T>
          ) : null}
        </Card>

        <SectionTitle title="Langue" />
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T weight="bold" style={{ flex: 1 }}>
            🇫🇷 Français
          </T>
          <T size={12} color={colors.textMuted}>
            Wolof : bientôt disponible
          </T>
        </Card>

        <SectionTitle title="Confidentialité" />
        <Card style={{ gap: space.md }}>
          <Row
            label="Code secret au démarrage"
            sub={lock.biometricAvailable ? 'Avec empreinte ou Face ID' : undefined}
            value={lock.enabled}
            onChange={(v) => (v ? setPinModal(true) : lock.setPin(null))}
          />
          <Row
            label="Notifications discrètes"
            sub="Aucun mot sur les règles ne s'affiche à l'écran"
            value={discreet}
            onChange={(v) => save({ notification_settings: { ...(user.notification_settings ?? {}), discreet: v } })}
          />
        </Card>

        <SectionTitle title="Rappels" />
        <Card style={{ gap: space.md }}>
          {reminders.data?.map((r) => <Row key={r.type} label={REMINDER_LABELS[r.type] ?? r.type} value={r.enabled} onChange={(v) => toggleReminder(r.type, v)} />)}
        </Card>

        <SectionTitle title="Mes données" />
        <Card style={{ gap: 4 }}>
          <Link icon="key-outline" label="Changer mon mot de passe" onPress={() => setPwdModal(true)} />
          <Link icon="calendar-outline" label="Corriger mes dates de règles" onPress={() => router.push('/periods')} />
          <Link icon="download-outline" label="Exporter mes données" onPress={exportData} />
          <Link icon="trash-outline" label="Supprimer mon compte" danger onPress={deleteAccount} />
        </Card>

        <SectionTitle title="À propos" />
        <Card style={{ gap: 4 }}>
          <Link icon="help-circle-outline" label="Questions fréquentes" onPress={() => router.push('/faq')} />
          <Link icon="mail-outline" label="Contacter l'équipe Moon" onPress={() => router.push({ pathname: '/help/new', params: { type: 'information' } })} />
          <Link icon="globe-outline" label="Politique de confidentialité" onPress={() => Linking.openURL('https://moon.example.org/confidentialite')} />
        </Card>

        <View style={{ marginTop: space.xl }}>
          <PartnersStrip title="Avec le soutien de" compact />
        </View>
        <Button title="Me déconnecter" variant="outline" icon="log-out-outline" style={{ marginTop: space.xl }} onPress={signOut} />
        <Disclaimer />
      </Screen>
      <PasswordModal
        visible={pwdModal}
        onClose={() => setPwdModal(false)}
        onSave={async (password) => {
          await updateUser({ password, password_confirmation: password });
          setPwdModal(false);
          setMessage('Mot de passe modifié ✓');
        }}
      />
      <PinModal
        visible={pinModal}
        onClose={() => setPinModal(false)}
        onSave={async (pin) => {
          await lock.setPin(pin);
          setPinModal(false);
        }}
      />
    </View>
  );
}

function Row({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1 }}>
        <T weight="bold">{label}</T>
        {sub && (
          <T size={12} color={colors.textMuted}>
            {sub}
          </T>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.purple, false: colors.border }} />
    </View>
  );
}

function Link({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 }}>
      <Ionicons name={icon} size={22} color={danger ? colors.red : colors.night} />
      <T weight="bold" color={danger ? colors.red : colors.text} style={{ flex: 1 }}>
        {label}
      </T>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function PasswordModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const valid = password.length >= 8 && password === confirm;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(43,24,88,0.5)', justifyContent: 'center', padding: space.xl }}>
        <Card>
          <T weight="black" size={19} style={{ marginBottom: space.md }}>
            Nouveau mot de passe
          </T>
          <Field label="Mot de passe (8 caractères minimum)" value={password} onChangeText={setPassword} secureTextEntry />
          <Field label="Confirme le mot de passe" value={confirm} onChangeText={setConfirm} secureTextEntry error={confirm && confirm !== password ? 'Les deux mots de passe sont différents.' : undefined} />
          {error ? <T color={colors.red}>{error}</T> : null}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <Button title="Annuler" variant="outline" style={{ flex: 1 }} onPress={onClose} />
            <Button
              title="Enregistrer"
              style={{ flex: 1 }}
              disabled={!valid}
              onPress={async () => {
                setError('');
                try {
                  await onSave(password);
                  setPassword('');
                  setConfirm('');
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function PinModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const valid = /^\d{4}$/.test(pin) && pin === confirm;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(43,24,88,0.5)', justifyContent: 'center', padding: space.xl }}>
        <Card>
          <T weight="black" size={19} style={{ marginBottom: space.md }}>
            Choisis un code à 4 chiffres
          </T>
          <TextInput value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="Code" style={pinInput} />
          <TextInput value={confirm} onChangeText={(v) => setConfirm(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="Confirme le code" style={pinInput} />
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <Button title="Annuler" variant="outline" style={{ flex: 1 }} onPress={onClose} />
            <Button title="Activer" style={{ flex: 1 }} disabled={!valid} onPress={() => onSave(pin)} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const pinInput = {
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 14,
  padding: 14,
  fontSize: 22,
  letterSpacing: 8,
  textAlign: 'center' as const,
  marginBottom: space.sm,
};
