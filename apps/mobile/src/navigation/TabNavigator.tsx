import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

const Tab = createBottomTabNavigator()

// Trivial placeholder screen — no real feature content/data, per R6. Real screens land in later
// changes once auth (#5) and feature APIs exist.
function HomePlaceholderScreen() {
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Text>{t('nav.home')}</Text>
    </View>
  )
}

// Single placeholder tab per design.md's nav shell sketch. The real tab set is introduced once
// feature screens exist — adding more placeholder tabs now would be scope creep beyond R6.
export function TabNavigator() {
  const { t } = useTranslation()
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomePlaceholderScreen} options={{ title: t('nav.home') }} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
