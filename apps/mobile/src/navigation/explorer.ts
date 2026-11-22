// Visiteur non connecté (décision du porteur, 2026-11-22) : l'application
// s'ouvre sur la page de connexion. Ce contexte fournit l'action « Découvrir
// les annonces sans compte » quand la connexion est le premier écran ; il
// vaut null quand la connexion est ouverte en fenêtre depuis l'application.
import { createContext, useContext } from 'react'

export const ContexteExplorer = createContext<(() => void) | null>(null)

export const useExplorer = () => useContext(ContexteExplorer)
