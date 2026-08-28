import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
import { emphasize, radius, shadow, space, type } from '../theme';
import { noWebOutline } from './HeightControl';
import { PrimaryButton } from './ui';

/**
 * El nombre del sitio, justo al guardarlo.
 *
 * Es el único momento en el que sabes de verdad qué sitio es y por qué lo
 * guardas. Un día después, «Cervera de Buitrago, Madrid» ya no distingue el
 * punto bueno del pantano del que tenía el tendido encima, y nadie entra a una
 * ficha a arreglarlo.
 *
 * Pide una cosa y sólo una. Todo lo que se explicara aquí —que se puede dejar
 * en blanco, que las notas se ponen luego— es texto que se lee una vez y estorba
 * cien: se sale sin escribir nada y ya está.
 */
export function FavoriteNamePrompt({
  visible,
  /** Nombre que dio el mapa: se usa de sugerencia, no se escribe por ti. */
  suggestion,
  onSave,
  onClose,
}: {
  visible: boolean;
  suggestion: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const p = usePalette();
  const [name, setName] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  // Cada vez que se abre empieza en blanco: es un sitio distinto.
  React.useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  const save = () => {
    const clean = name.trim();
    if (clean) onSave(clean);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Tocar fuera equivale a «ahora no»: el sitio ya está guardado. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('favoritePrompt.skip')}
        style={{
          flex: 1,
          backgroundColor: '#00000073',
          justifyContent: 'center',
          padding: space.lg,
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* El card se para el toque: si no, escribir dentro cerraría el diálogo. */}
          <Pressable
            onPress={() => {}}
            style={[
              {
                backgroundColor: p.surface,
                borderRadius: radius.xl,
                padding: space.xl,
                gap: space.md,
                alignSelf: 'center',
                width: '100%',
                maxWidth: 380,
              },
              shadow.panel,
            ]}
          >
            <Text style={[emphasize(type.headline), { color: p.label }]}>
              {t('favoritePrompt.title')}
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={suggestion ?? t('favorite.field.namePlaceholder')}
              placeholderTextColor={p.labelTertiary}
              autoCapitalize="sentences"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={save}
              accessibilityLabel={t('favoritePrompt.title')}
              style={[
                type.callout,
                {
                  color: p.label,
                  paddingHorizontal: space.md,
                  minHeight: 44,
                  borderRadius: radius.md,
                  backgroundColor: p.surfaceSunken,
                  borderWidth: 1,
                  borderColor: focused ? p.tint : 'transparent',
                },
                noWebOutline,
              ]}
            />

            <PrimaryButton
              label={t('favoritePrompt.save')}
              onPress={save}
              disabled={name.trim().length === 0}
            />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
