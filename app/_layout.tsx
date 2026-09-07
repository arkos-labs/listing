import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
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
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        html, body, #root {
          touch-action: pan-x pan-y;
          -ms-touch-action: pan-x pan-y;
          overscroll-behavior-y: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
        * {
          touch-action: pan-x pan-y !important;
        }
        input, textarea, select {
          font-size: 16px !important;
        }
      `;
      document.head.appendChild(style);

      const preventZoom = (e: any) => {
        if (e.touches && e.touches.length > 1) {
          e.preventDefault();
        }
      };
      document.addEventListener('touchstart', preventZoom, { passive: false, capture: true });
      document.addEventListener('touchmove', preventZoom, { passive: false, capture: true });

      let lastTap = 0;
      const preventDblTap = (e: any) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
          e.preventDefault();
        }
        lastTap = currentTime;
      };
      document.addEventListener('touchend', preventDblTap, { passive: false, capture: true });

      const preventGesture = (e: any) => e.preventDefault();
      document.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
      document.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
      document.addEventListener('gestureend', preventGesture, { passive: false, capture: true });
      
      const preventWheel = (e: any) => {
        if (e.ctrlKey) e.preventDefault();
      };
      window.addEventListener('wheel', preventWheel, { passive: false, capture: true });
    }
  }, []);

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
