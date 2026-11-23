import React, { useEffect, useState } from 'react';
import { setToken } from './api.js';
import LoginPage from './pages/LoginPage.jsx';
import AnimalsPage from './pages/AnimalsPage.jsx';
import ProtocolPage from './pages/ProtocolPage.jsx';

function restoreSession() {
    try {
        const saved = JSON.parse(localStorage.getItem('ganaderia.session'));
        if (typeof saved?.token === 'string' && saved.token) {
            setToken(saved.token);
            return saved;
        }
    } catch { /* An unavailable store or invalid JSON starts a fresh session. */ }
    setToken(null);
    return null;
}

export default function App() {
    const [session, setSession] = useState(restoreSession);
    const [route, setRoute] = useState(window.location.hash);
    const [animals, setAnimals] = useState([]);
    const [demo, setDemo] = useState(null);

    useEffect(() => {
        const update = () => setRoute(window.location.hash);
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, []);
    useEffect(() => {
        if (!session && route !== '#/login') window.location.hash = '/login';
        else if (session && !['#/animals', '#/protocol'].includes(route)) window.location.hash = '/animals';
    }, [session, route]);

    function enter(nextSession) {
        setToken(nextSession.token);
        try { localStorage.setItem('ganaderia.session', JSON.stringify(nextSession)); }
        catch { /* The in-memory session still works when storage is disabled. */ }
        setSession(nextSession);
        window.location.hash = '/animals';
    }

    return <>
        <style>{`
            :root { font-family: system-ui, sans-serif; color: #172c24; background: #f2f6f3; }
            body { margin: 0; }
            main { max-width: 44rem; margin: 2rem auto; padding: 1.5rem; background: #fff; }
            h1, h2 { line-height: 1.3; }
            form { display: grid; gap: 1rem; }
            label { display: grid; gap: .35rem; font-weight: 600; }
            input, select, button { font: inherit; padding: .7rem; border: 1px solid #52685c; border-radius: .3rem; }
            button { color: #fff; background: #14532d; cursor: pointer; margin: .5rem 0; }
            button:disabled { color: #fff; background: #526057; cursor: not-allowed; }
            :focus-visible { outline: 3px solid #174ea6; outline-offset: 3px; }
            [role=alert] { color: #991b1b; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
            th, td { text-align: left; padding: .6rem; border-bottom: 1px solid #52685c; }
        `}</style>
        <main>
            <h1>Ganadería</h1>
            {!session ? <LoginPage onSession={enter} /> : route === '#/protocol'
                ? <ProtocolPage animals={animals} demo={demo} setDemo={setDemo} />
                : <AnimalsPage animals={animals} setAnimals={setAnimals} />}
        </main>
    </>;
}
