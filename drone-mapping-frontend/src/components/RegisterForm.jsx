function RegisterForm() {
    return (
        <div className="register-form">
            <h2>Register</h2>
            <form>
                <div>
                    <label htmlFor="name">Full Name</label>
                    <input type="text" id="name" name="name" />
                </div>
                <div>
                    <label htmlFor="reg-email">Email</label>
                    <input type="email" id="reg-email" name="email" />
                </div>
                <div>
                    <label htmlFor="reg-password">Password</label>
                    <input type="password" id="reg-password" name="password" />
                </div>
                <div>
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input type="password" id="confirm-password" name="confirmPassword" />
                </div>
                <button type="submit">Register</button>
            </form>
        </div>
    )
}

export default RegisterForm