import { Stack } from 'expo-router';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CoursesProvider } from '@/context/CoursesContext';
import { FuelProvider } from '@/context/FuelContext';
import { KmProvider } from '@/context/KmContext';
import { MaintenanceProvider } from '@/context/MaintenanceContext';
import { MotoProvider } from '@/context/MotoContext';
import { ReferenceProvider } from '@/context/ReferenceContext';
import { ClosuresProvider } from '@/context/ClosuresContext';
import { GoalProvider } from '@/context/GoalContext';
import { SyncProvider } from '@/context/SyncContext';
import { WorkProvider } from '@/context/WorkContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CoursesProvider>
          <FuelProvider>
            <KmProvider>
              <MaintenanceProvider>
                <MotoProvider>
                  <ReferenceProvider>
                    <ClosuresProvider>
                      <GoalProvider>
                        <SyncProvider>
                          <WorkProvider>
                            <Stack screenOptions={{ headerShown: false }} />
                          </WorkProvider>
                        </SyncProvider>
                      </GoalProvider>
                    </ClosuresProvider>
                  </ReferenceProvider>
                </MotoProvider>
              </MaintenanceProvider>
            </KmProvider>
          </FuelProvider>
        </CoursesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
