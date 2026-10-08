function Header({ backendOnline = true }) {
    return (
        <header className="header">

            <div className="brand">

                <div className="brand-icon">
                    AI
                </div>

                <div>
                    <h1>
                        Stock Market AI
                    </h1>

                    <p>
                        ML prediction & financial sentiment analytics
                    </p>
                </div>

            </div>


            <div className="status">

                <span
                    className={
                        `status-dot ${
                            !backendOnline
                                ? "offline"
                                : ""
                        }`
                    }
                />

                {backendOnline
                    ? "Backend connected"
                    : "Backend offline"}

            </div>

        </header>
    );
}

export default Header;