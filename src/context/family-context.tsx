import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'

interface FamilyContextValue {
  selectedFamilyId: string | null
  setSelectedFamilyId: (id: string | null) => void
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [selectedFamilyId, setSelectedFamilyIdState] = useState<string | null>(
    null
  )

  // On mount, initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('kyn-selected-family')
      setSelectedFamilyIdState(storedId)
    }
  }, [])

  // When selectedFamilyId changes, update localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedFamilyId) {
        localStorage.setItem('kyn-selected-family', selectedFamilyId)
      } else {
        localStorage.removeItem('kyn-selected-family')
      }
    }
  }, [selectedFamilyId])

  const setSelectedFamilyId = (id: string | null) => {
    setSelectedFamilyIdState(id)
  }

  return (
    <FamilyContext.Provider value={{ selectedFamilyId, setSelectedFamilyId }}>
      {children}
    </FamilyContext.Provider>
  )
}

export function useFamilyContext() {
  const ctx = useContext(FamilyContext)
  if (!ctx) {
    throw new Error('useFamilyContext must be used within FamilyProvider')
  }
  return ctx
}
