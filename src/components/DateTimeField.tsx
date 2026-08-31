import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { usePalette } from '../hooks/useTheme';
import { dateLocale, t } from '../i18n';
import { radius, space, systemColor, type } from '../theme';
import { Field } from './Field';

/**
 * Fecha y hora, con el selector del sistema.
 *
 * Los tres sitios de los que sale un documento —la solicitud al gestor, el
 * impreso de Interior y la EARO— preguntan lo mismo, y hasta ahora se
 * escribía a mano dentro del cliente de correo. Aquí se elige con la rueda de
 * iOS o el diálogo de Android, que es lo que la gente ya sabe usar y lo que
 * hace imposible escribir el 31 de febrero.
 *
 * Las tres plataformas se comportan distinto y por eso hay tres caminos:
 *  - iOS pinta el selector en línea, dentro de la propia fila.
 *  - Android lo abre como diálogo, de forma imperativa.
 *  - En el navegador no hay selector nativo que merezca la pena, así que se
 *    cae a un campo de texto con su formato explicado. La web es la versión de
 *    mirar, no la de rellenar papeles en el campo.
 *
 * Por dentro los valores viajan como texto —`AAAA-MM-DD` y `HH:MM`— porque es
 * lo que guardan el modelo y los documentos. `Date` sólo existe el rato que
 * dura la elección.
 */

const isWeb = Platform.OS === 'web';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateValue(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

function toTimeValue(time: string): Date {
  const m = /^(\d{2}):(\d{2})$/.exec(time.trim());
  const now = new Date();
  if (!m) return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]), Number(m[2]), 0, 0);
}

/** Cómo se le enseña la fecha al piloto, en su idioma. */
function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return '';
  return toDateValue(iso).toLocaleDateString(dateLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Shell({
  label,
  filled,
  hint,
  error,
  children,
}: {
  label: string;
  filled: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[type.footnote, { color: p.labelSecondary, flex: 1 }]}>{label}</Text>
        {filled && !error ? (
          <Ionicons name="checkmark-circle" size={15} color={systemColor('green', p)} />
        ) : null}
      </View>
      {children}
      {error ? (
        <Text style={[type.caption, { color: systemColor('red', p) }]}>{error}</Text>
      ) : hint ? (
        <Text style={[type.caption, { color: p.labelTertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

function Row({
  text,
  placeholder,
  icon,
  onPress,
  error,
  children,
}: {
  text: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  error?: string | null;
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const filled = text.length > 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: space.md,
        minHeight: 44,
        borderRadius: radius.md,
        backgroundColor: p.surfaceSunken,
        borderWidth: 1,
        borderColor: error ? systemColor('red', p) : 'transparent',
        opacity: pressed && onPress ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={17} color={p.labelSecondary} />
      <Text
        style={[type.callout, { color: filled ? p.label : p.labelTertiary, flex: 1 }]}
        numberOfLines={1}
      >
        {filled ? text : placeholder}
      </Text>
      {children}
    </Pressable>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  hint?: string;
  error?: string | null;
}) {
  const [showIos, setShowIos] = useState(false);

  const commit = (d: Date) => {
    onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  if (isWeb) {
    return (
      <Field
        label={label}
        value={value}
        onChange={onChange}
        placeholder="2026-09-14"
        hint={hint ?? t('dateField.webHint')}
        error={error}
        keyboardType="numbers-and-punctuation"
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Shell label={label} filled={value.length > 0} hint={hint} error={error}>
        <Row
          text={prettyDate(value)}
          placeholder={t('dateField.placeholder')}
          icon="calendar-outline"
          error={error}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: toDateValue(value),
              mode: 'date',
              minimumDate: new Date(),
              onChange: (_e, d) => {
                if (d) commit(d);
              },
            })
          }
        />
      </Shell>
    );
  }

  return (
    <Shell label={label} filled={value.length > 0} hint={hint} error={error}>
      <Row
        text={prettyDate(value)}
        placeholder={t('dateField.placeholder')}
        icon="calendar-outline"
        error={error}
        onPress={() => setShowIos((v) => !v)}
      >
        {showIos ? (
          <DateTimePicker
            value={toDateValue(value)}
            mode="date"
            display="compact"
            minimumDate={new Date()}
            onChange={(_e, d) => {
              if (d) commit(d);
            }}
          />
        ) : null}
      </Row>
    </Shell>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
  hint?: string;
  error?: string | null;
}) {
  const [showIos, setShowIos] = useState(false);

  const commit = (d: Date) => onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);

  if (isWeb) {
    return (
      <Field
        label={label}
        value={value}
        onChange={onChange}
        placeholder="18:00"
        hint={hint ?? t('timeField.webHint')}
        error={error}
        keyboardType="numbers-and-punctuation"
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Shell label={label} filled={value.length > 0} hint={hint} error={error}>
        <Row
          text={value}
          placeholder={t('timeField.placeholder')}
          icon="time-outline"
          error={error}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: toTimeValue(value),
              mode: 'time',
              is24Hour: true,
              onChange: (_e, d) => {
                if (d) commit(d);
              },
            })
          }
        />
      </Shell>
    );
  }

  return (
    <Shell label={label} filled={value.length > 0} hint={hint} error={error}>
      <Row
        text={value}
        placeholder={t('timeField.placeholder')}
        icon="time-outline"
        error={error}
        onPress={() => setShowIos((v) => !v)}
      >
        {showIos ? (
          <DateTimePicker
            value={toTimeValue(value)}
            mode="time"
            display="compact"
            onChange={(_e, d) => {
              if (d) commit(d);
            }}
          />
        ) : null}
      </Row>
    </Shell>
  );
}
