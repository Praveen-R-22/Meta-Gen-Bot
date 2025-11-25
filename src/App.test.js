import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext'; // <-- IMPORT AUTHPROVIDER

// Mock react-speech-recognition
jest.mock('react-speech-recognition', () => ({
  __esModule: true,
  default: () => ({
    browserSupportsSpeechRecognition: true,
    listening: false,
    resetTranscript: () => {},
    startListening: () => {},
    stopListening: () => {},
  }),
  useSpeechRecognition: () => ({
    browserSupportsSpeechRecognition: true,
    listening: false,
    resetTranscript: () => {},
    transcript: '',
  }),
}));

test('renders sign in page for unauthenticated user', () => {
  // Wrap App in the provider it needs
  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  
  // Since a new user is not logged in, they should be
  // redirected to the login page, which contains "Sign In"
  const linkElement = screen.getByText(/Sign In/i);
  expect(linkElement).toBeInTheDocument();
});