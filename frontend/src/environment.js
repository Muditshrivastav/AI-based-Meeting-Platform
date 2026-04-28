const server = process.env.REACT_APP_SERVER_URL ||
    (process.env.NODE_ENV === "production"
        ? "https://apnacollegebackend.onrender.com"
        : "http://localhost:8000")


export default server;
