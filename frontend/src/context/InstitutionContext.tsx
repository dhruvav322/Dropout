import { createContext, useContext, useState, type ReactNode } from 'react';

interface InstitutionContextType {
  institution: string;
  setInstitution: (name: string) => void;
}

const InstitutionContext = createContext<InstitutionContextType>({
  institution: '',
  setInstitution: () => {},
});

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState('');
  return (
    <InstitutionContext.Provider value={{ institution, setInstitution }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  return useContext(InstitutionContext);
}
