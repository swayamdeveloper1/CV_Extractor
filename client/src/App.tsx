// import React, { useState } from "react";
// import { Login } from "./components/Login";
// import { Dashboard } from "./components/Dashboard";
// import { ThemeProvider } from "./contexts/ThemeContext";
// import { loginApi } from "./services/api";
// import "./styles/App.css";

// interface User {
//   id: number;
//   username: string;
//   name: string;
// }

// const App: React.FC = () => {
//   const [user, setUser] = useState<User | null>(() => {
//     const stored = localStorage.getItem("user");
//     return stored ? JSON.parse(stored) : null;
//   });

//   const handleLogin = async (username: string, password: string) => {
//     const res = await loginApi(username, password);
//     localStorage.setItem("token", res.token);
//     localStorage.setItem("user", JSON.stringify(res.user));
//     setUser(res.user);
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     setUser(null);
//   };

//   return (
//     <ThemeProvider>
//       {user ? (
//         <Dashboard user={user} onLogout={handleLogout} />
//       ) : (
//         <Login onLogin={handleLogin} />
//       )}
//     </ThemeProvider>
//   );
// };

// export default App;


import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { loginApi } from "./services/api";
import PrivacyPolicy from "./components/PrivacyPolicy";
import "./styles/App.css";

interface User {
  id: number;
  username: string;
  name: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogin = async (username: string, password: string) => {
    const res = await loginApi(username, password);
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          <Route
            path="/privacy-policy"
            element={<PrivacyPolicy />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;