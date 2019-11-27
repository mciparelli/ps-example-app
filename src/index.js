import React, { Fragment, useEffect, useState } from "react";
import { render } from "react-dom";
import { json } from "@highpoint/js-fetch";

const ERROR_CREDENTIALS = "1000";
const ERROR_LOGGED_OUT = "105";

const errorMessages = {
  [ERROR_LOGGED_OUT]: "You are logged out of the server.",
  [ERROR_CREDENTIALS]: "Wrong credentials"
};

const request = (url, options) =>
  json(
    url.charAt(0) === "/"
      ? url.slice(1)
      : `psc/${process.env.PS_ENVIRONMENT}/${url}`,
    { ...options, credentials: "include" }
  );

const login = ({ user, password }) =>
  request("?cmd=login", {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `userid=${user}&pwd=${password}`
  })
    .catch(err =>
      request("EMPLOYEE/SA/s/WEBLIB_H_DEMO.ISCRIPT1.FieldFormula.IScript_Init")
    )
    .catch(_err => {
      throw new AppError(ERROR_CREDENTIALS);
    });

class AppError extends Error {
  constructor(code) {
    super(errorMessages[code]);
    this.name = "AppError";
    this.code = code;
  }
}

const LoginForm = ({ error, request, onError, onLoggedIn }) => (
  <form
    method="post"
    onSubmit={async ev => {
      ev.preventDefault();
      const { user, password } = ev.target.elements;
      try {
        const response = await login({
          user: user.value,
          password: password.value
        });
        onLoggedIn(response);
      } catch (err) {
        onError(err);
      }
    }}
  >
    {error && <div>{error}</div>}
    <input type="text" name="user" />
    <input type="password" name="password" />
    <button type="submit">save</button>
  </form>
);

class ErrorHandler extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  setError = error => this.setState({ error });

  render() {
    return this.props.children({
      error: this.state.error,
      setError: this.setError
    });
  }
}

const Welcome = ({ user, services, onLoggedOut }) => (
  <div>
    <h1>Welcome {user}!</h1>
    <button
      key="get"
      type="button"
      onClick={async _ev => {
        console.log(await request(services.helloGet));
      }}
    >
      text get
    </button>
    <button
      key="put"
      type="button"
      onClick={async _ev => {
        console.log(await request(services.helloPut, { method: "PUT" }));
      }}
    >
      text put
    </button>
    <button
      key="post"
      type="button"
      onClick={async _ev => {
        console.log(await request(services.helloPost, { method: "POST" }));
      }}
    >
      text post
    </button>
    <button
      key="delete"
      type="button"
      onClick={async _ev => {
        console.log(await request(services.helloDelete, { method: "DELETE" }));
      }}
    >
      text delete
    </button>
    <button
      type="button"
      onClick={async () => {
        await request("?cmd=logout");
        onLoggedOut();
      }}
    >
      logout
    </button>
  </div>
);

const ActualApp = ({ error, clearError, onError }) => {
  const [userData, setUserData] = useState();
  const onLogin = data => {
    clearError();
    setUserData(data);
  };
  useEffect(() => {
    request(
      "EMPLOYEE/SA/s/WEBLIB_H_DEMO.ISCRIPT1.FieldFormula.IScript_Init"
    ).then(onLogin);
  }, []);
  return !error && userData ? (
    <Welcome
      user={userData.user}
      services={userData.services.reduce(
        (acc, obj) => ({ ...acc, ...obj }),
        {}
      )}
      onLoggedOut={() => onError(new AppError(ERROR_LOGGED_OUT))}
    />
  ) : (
    <LoginForm
      error={
        error && [ERROR_CREDENTIALS, ERROR_LOGGED_OUT].includes(error.code)
          ? error.message
          : undefined
      }
      onError={onError}
      onLoggedIn={onLogin}
    />
  );
};

const App = () => {
  return (
    <ErrorHandler>
      {({ error, setError }) => (
        <Fragment>
          <base href={`//${process.env.PS_HOSTNAME}`} />
          <ActualApp
            onError={setError}
            clearError={() => setError()}
            error={error}
          />
        </Fragment>
      )}
    </ErrorHandler>
  );
};

render(<App />, document.getElementById("app"));
