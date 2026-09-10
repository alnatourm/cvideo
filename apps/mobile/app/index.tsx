import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.brand}>CVIDEO</Text><Text style={styles.badge}>Candidate preview</Text></View>
        <Text style={styles.eyebrow}>REVERSE EMPLOYMENT</Text>
        <Text style={styles.title}>Get discovered before a vacancy exists.</Text>
        <Text style={styles.body}>Create your professional profile, add a 30-second introduction video, and let companies find you.</Text>
        <View style={styles.video}><Text style={styles.videoLabel}>30s Introduction Video</Text><Text style={styles.play}>▶</Text></View>
        <View style={styles.card}><Text style={styles.name}>Your professional profile</Text><Text style={styles.meta}>Skills · Experience · Certificates · Preferred Roles</Text><TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Build Profile</Text></TouchableOpacity></View>
        <View style={styles.nav}><Text style={styles.navActive}>Home</Text><Text style={styles.navItem}>Messages</Text><Text style={styles.navItem}>Profile</Text></View>
        <Text style={styles.note}>Phase 1 visual shell only. Authentication and protected data are intentionally not implemented.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#0B132B', fontWeight: '900', letterSpacing: 2, fontSize: 20 },
  badge: { color: '#2563EB', fontWeight: '700', fontSize: 12 },
  eyebrow: { color: '#2563EB', fontWeight: '800', letterSpacing: 1.5, fontSize: 11, marginTop: 20 },
  title: { color: '#0F172A', fontSize: 36, lineHeight: 40, fontWeight: '900' },
  body: { color: '#64748B', fontSize: 16, lineHeight: 24 },
  video: { minHeight: 420, backgroundColor: '#0B132B', borderRadius: 24, padding: 18, justifyContent: 'space-between' },
  videoLabel: { color: '#FFFFFF', fontWeight: '800', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  play: { color: '#22D3EE', fontSize: 44, alignSelf: 'center', marginBottom: 160 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  name: { color: '#0F172A', fontWeight: '900', fontSize: 20 },
  meta: { color: '#64748B', lineHeight: 20 },
  primary: { backgroundColor: '#2563EB', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginTop: 4 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#0B132B', borderRadius: 18, paddingVertical: 16 },
  navActive: { color: '#22D3EE', fontWeight: '900' },
  navItem: { color: '#CBD5E1', fontWeight: '700' },
  note: { color: '#64748B', fontSize: 12, textAlign: 'center', marginBottom: 12 },
});
