import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { usePalette } from '../hooks/useTheme';
import { useDocuments } from '../state/DocumentsContext';
import { documentsSupported, openStored } from '../documents/files';
import {
  DOC_CATEGORIES,
  docCategoryLabel,
  documentStatus,
  daysUntil,
  fileIcon,
  formatBytes,
  formatDateInput,
  formatDateLong,
  parseDateInput,
  type DocCategory,
  type StoredDocument,
} from '../logic/documents';
import { dateLocale, t } from '../i18n';
import { emphasize, radius, space, systemColor, type } from '../theme';
import { Card, Chip, Separator } from './ui';
import { Chevron, Collapsible } from './motion';
import { Field } from './Field';

/**
 * Carpeta de documentos de un dueño: tú (droneId = null) o uno de tus drones.
 *
 * La misma pieza sirve en el perfil y en la ficha de cada dron porque la
 * pregunta es la misma —«qué papeles tengo de esto»— y cambiar de sitio no
 * debería cambiar cómo se hace. Cada fila se despliega para editar sus datos,
 * abrirlo o borrarlo; nada de pantallas nuevas para cambiar una fecha.
 */
export function DocumentSection({
  droneId,
  defaultCategory,
}: {
  droneId: string | null;
  /** Con qué categoría entran los archivos nuevos aquí. */
  defaultCategory: DocCategory;
}) {
  const p = usePalette();
  const { forOwner, addFromPicker } = useDocuments();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docs = forOwner(droneId);

  const add = async () => {
    if (!documentsSupported) {
      setError(t('docs.webUnsupported'));
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const n = await addFromPicker(droneId, defaultCategory);
      if (n > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setError(t('docs.pickError'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <Card padded={false}>
        {docs.length === 0 ? (
          <View style={{ padding: space.lg }}>
            <Text style={[type.callout, { color: p.labelSecondary }]}>{t('docs.empty')}</Text>
          </View>
        ) : (
          docs.map((doc, i) => (
            <View key={doc.id}>
              {i > 0 ? <Separator inset={space.lg} /> : null}
              <DocumentRow doc={doc} onError={setError} />
            </View>
          ))
        )}

        <Separator inset={space.lg} />
        <Pressable
          onPress={add}
          disabled={adding}
          accessibilityRole="button"
          accessibilityState={{ busy: adding }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            padding: space.lg,
            minHeight: 56,
            backgroundColor: pressed ? p.surfaceSunken : 'transparent',
          })}
        >
          <Ionicons name={adding ? 'hourglass-outline' : 'add-circle-outline'} size={22} color={p.tint} />
          <Text style={[emphasize(type.callout), { color: p.tint }]}>
            {adding ? t('docs.adding') : t('docs.add')}
          </Text>
        </Pressable>
      </Card>

      {error ? (
        <Text style={[type.caption, { color: systemColor('red', p), paddingHorizontal: space.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Una fila de la carpeta, con sus datos plegados detrás del propio nombre. */
function DocumentRow({
  doc,
  onError,
}: {
  doc: StoredDocument;
  onError: (message: string | null) => void;
}) {
  const p = usePalette();
  const { updateDocument, removeDocument } = useDocuments();
  const [open, setOpen] = useState(false);
  const [dateText, setDateText] = useState(formatDateInput(doc.expiresAt));
  const [dateError, setDateError] = useState<string | null>(null);

  const status = documentStatus(doc);
  const days = doc.expiresAt ? daysUntil(doc.expiresAt) : null;
  const statusColor =
    status === 'caducado'
      ? systemColor('red', p)
      : status === 'porCaducar'
        ? systemColor('orange', p)
        : p.labelSecondary;

  const addedOn = new Date(doc.addedAt).toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const onDateChange = (text: string) => {
    setDateText(text);
    if (!text.trim()) {
      setDateError(null);
      updateDocument(doc.id, { expiresAt: null });
      return;
    }
    const iso = parseDateInput(text);
    if (!iso) {
      setDateError(t('docs.dateInvalid'));
      return;
    }
    setDateError(null);
    updateDocument(doc.id, { expiresAt: iso });
  };

  const open_ = async () => {
    onError(null);
    const res = await openStored(doc);
    if (res === 'missing') onError(t('docs.missingFile'));
    else if (res === 'unsupported') onError(t('docs.openError'));
  };

  const confirmDelete = () => {
    Alert.alert(t('docs.delete'), t('docs.deleteConfirm', doc.title), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeDocument(doc.id) },
    ]);
  };

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.lg,
          minHeight: 64,
          backgroundColor: pressed ? p.surfaceSunken : 'transparent',
        })}
      >
        <Ionicons
          name={fileIcon(doc) as keyof typeof Ionicons.glyphMap}
          size={22}
          color={p.labelSecondary}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
            {doc.title}
          </Text>
          <Text style={[type.caption, { color: p.labelTertiary }]} numberOfLines={1}>
            {docCategoryLabel(doc.category)} · {t('docs.fileLine', formatBytes(doc.size), addedOn)}
          </Text>
          {doc.expiresAt ? (
            <Text style={[type.caption, { color: statusColor }]}>
              {status === 'caducado'
                ? t('docs.expiredOn', formatDateLong(doc.expiresAt))
                : t('docs.validUntil', formatDateLong(doc.expiresAt))}
            </Text>
          ) : null}
        </View>
        {status === 'caducado' ? (
          <Chip label={t('docs.status.expired')} color={systemColor('red', p)} />
        ) : status === 'porCaducar' && days !== null ? (
          <Chip label={t('docs.status.soon', days)} color={systemColor('orange', p)} />
        ) : null}
        <Chevron open={open} color={p.labelTertiary} size={15} />
      </Pressable>

      <Collapsible open={open}>
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md }}>
          <Field
            label={t('docs.field.title')}
            value={doc.title}
            onChange={(title) => updateDocument(doc.id, { title })}
            placeholder={t('docs.field.titlePlaceholder')}
            autoCapitalize="sentences"
          />

          <View style={{ gap: 6 }}>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>{t('docs.category')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {DOC_CATEGORIES.map((c) => {
                const active = c.id === doc.category;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      updateDocument(doc.id, { category: c.id });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: space.md,
                      paddingVertical: 8,
                      minHeight: 36,
                      borderRadius: radius.sm,
                      backgroundColor: active ? p.tintSoft : p.surfaceSunken,
                    }}
                  >
                    <Ionicons
                      name={c.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? p.tint : p.labelSecondary}
                    />
                    <Text
                      style={[
                        emphasize(type.footnote, active ? '600' : '500'),
                        { color: active ? p.tint : p.labelSecondary },
                      ]}
                    >
                      {docCategoryLabel(c.id)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field
            label={t('docs.field.expires')}
            value={dateText}
            onChange={onDateChange}
            placeholder={t('docs.field.expiresPlaceholder')}
            keyboardType="numbers-and-punctuation"
            hint={t('docs.field.expiresHelp')}
            error={dateError}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Pressable
              onPress={open_}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                minHeight: 44,
                borderRadius: radius.md,
                backgroundColor: p.tintSoft,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="open-outline" size={16} color={p.tint} />
              <Text style={[emphasize(type.subheadline), { color: p.tint }]}>{t('docs.open')}</Text>
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel={t('docs.delete')}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: p.surfaceSunken,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="trash-outline" size={18} color={systemColor('red', p)} />
            </Pressable>
          </View>

          <Text style={[type.caption, { color: p.labelTertiary }]} numberOfLines={1}>
            {doc.fileName}
          </Text>
        </View>
      </Collapsible>
    </View>
  );
}
