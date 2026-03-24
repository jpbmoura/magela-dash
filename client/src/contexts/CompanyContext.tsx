import { createContext, useContext, useMemo, useState } from "react";

const COMPANY_STORAGE_KEY = "selected-company";
export const ALL_COMPANIES_VALUE = "__ALL__";

type CompanyContextValue = {
  selectedCompany: string | null;
  setSelectedCompany: (value: string | null) => void;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

function readInitialCompany(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(COMPANY_STORAGE_KEY);
  if (!stored || stored === ALL_COMPANIES_VALUE) return null;
  return stored;
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<string | null>(() =>
    readInitialCompany()
  );

  const setSelectedCompany = (value: string | null) => {
    setSelectedCompanyState(value);
    if (typeof window === "undefined") return;
    if (!value) {
      window.localStorage.setItem(COMPANY_STORAGE_KEY, ALL_COMPANIES_VALUE);
      return;
    }
    window.localStorage.setItem(COMPANY_STORAGE_KEY, value);
  };

  const contextValue = useMemo(
    () => ({ selectedCompany, setSelectedCompany }),
    [selectedCompany]
  );

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}
