import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePalette } from '../hooks/useTheme';
import { radius, space, systemColor, type, emphasize } from '../theme';
import { Chevron, Collapsible } from './motion';

/**
 * Los dos selectores de los formularios.
 *
 * `Segmented` para dos o tres opciones cortas y excluyentes —VLOS o BVLOS, de
 * día o de noche—, donde esconder las alternativas detrás de un desplegable
 * sólo añade un toque. `Select` para listas más largas, que se despliegan en
 * el sitio en vez de tapar la pantalla con una hoja: el formulario se lee de
 * arriba abajo y una hoja modal rompe esa lectura.
 *
 * Los dos siguen la misma forma que `Field`: rótulo arriba en gris, control
 * debajo sobre fondo hundido, y la palomita verde cuando ya hay respuesta.
 */

export interface Option<T extends string> {
  id: T;
  label: string;
  /** Aclaración corta bajo la opción, cuando el rótulo no se explica solo. */
  hint?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  const p = usePalette();

  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.footnote, { color: p.labelSecondary }]}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: p.surfaceSunken,
          borderRadius: radius.md,
          padding: 3,
          gap: 3,
        }}
      >
        {options.map((o) => {
          const active = o.id === value;
          return (
            <Pressable
              key={o.id}
              onPress={() => onChange(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm,
                backgroundColor: active ? p.surface : 'transparent',
                opacity: pressed && !active ? 0.6 : 1,
              })}
            >
              <Text
                style={[
                  type.footnote,
                  active ? emphasize(type.footnote) : null,
                  { color: active ? p.label : p.labelSecondary },
                ]}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={[type.caption, { color: p.labelTertiary }]}>{hint}</Text> : null}
    </View>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (v: T) => void;
  /** Qué poner cuando todavía no hay nada elegido. */
  placeholder?: string;
  hint?: string;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value) ?? null;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[type.footnote, { color: p.labelSecondary, flex: 1 }]}>{label}</Text>
        {current ? (
          <Ionicons name="checkmark-circle" size={15} color={systemColor('green', p)} />
        ) : null}
      </View>

      <View style={{ backgroundColor: p.surfaceSunken, borderRadius: radius.md, overflow: 'hidden' }}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label}: ${current?.label ?? placeholder ?? ''}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.md,
            minHeight: 44,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={[type.callout, { color: current ? p.label : p.labelTertiary, flex: 1 }]}
            numberOfLines={1}
          >
            {current?.label ?? placeholder ?? ''}
          </Text>
          <Chevron open={open} color={p.labelTertiary} size={14} />
        </Pressable>

        <Collapsible open={open}>
          <View style={{ paddingBottom: space.xs }}>
            {options.map((o) => {
              const active = o.id === value;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    paddingHorizontal: space.md,
                    paddingVertical: 10,
                    minHeight: 40,
                    backgroundColor: pressed ? p.surface : 'transparent',
                  })}
                >
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={[type.callout, { color: p.label }]}>{o.label}</Text>
                    {o.hint ? (
                      <Text style={[type.caption, { color: p.labelTertiary }]}>{o.hint}</Text>
                    ) : null}
                  </View>
                  {active ? <Ionicons name="checkmark" size={17} color={p.tint} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Collapsible>
      </View>

      {hint ? <Text style={[type.caption, { color: p.labelTertiary }]}>{hint}</Text> : null}
    </View>
  );
}
