import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API, JWT_SECRET, SKIP_2FA, THEME, CBM_URL, DISABLE_OI, DISABLE_CBM, SESSION_TIMEOUT, CBM_TOKEN,DISABLE_TXALERT2, TXALERT2_TOKEN } from "../config/config";
import OtpVerify from "../components/OtpVerify";
import OptionVerify from "../components/OptionVerify";
import Multilingual from "./../helper/Multilingual";
import md5 from "md5";
import axios from "axios";
import moment from "moment";
import Swal from "sweetalert2";
import AssociationsChecker from "./../helper/AssociationsChecker";
import AssociationReferences from "./../helper/AssociationReferences";
import { Form, Input, Button, Row, Col, ConfigProvider, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import JWT from "jsonwebtoken";
import GroupAccess from "../helper/GroupAccess";
import CBMToken from "../helper/CBMToken";

const { Paragraph } = Typography;

const Login = (props) => {
    const [t, locale, getDropdownSelectLanguage] = Multilingual();
    const [login, setLogin] = useState({ email: "", password: "" });
    const [user, setUser] = useState(null);
    const [otp, setOtp] = useState("");
    const [rememberme, setRemember] = useState("");
    const [iscookieEnabled,setIsCookieEnabled] = useState(false);
    const [isLoginLoading, setIsLogingLoading] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    const layout = {
        layout: "vertical",
    };

    const timeoutAfter = SESSION_TIMEOUT && Number.isInteger(SESSION_TIMEOUT) && SESSION_TIMEOUT > 1 ? SESSION_TIMEOUT : 15;

    useEffect(() => {
       
        document.title = t("login.login");
        if (localStorage.getItem("loggedUser")) {
            const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
            

            if (loggedUser) {
               
                props.history.push("/dashboard");
            }
        }
        if (localStorage.getItem("sessionExpired")) {
            setIsSessionExpired(true);
            localStorage.removeItem("sessionExpired");
        }

        preCookieCheck();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const formValChange = (chgV, allV) => {
        setLogin(allV);
    };

    const optionChange = (payload) => {
        setUser({ ...user, ...payload });
    };

    const otpChange = (otp) => {
        setOtp(otp);
    };

    const rememberChange = (rme) => {
        setRemember(rme.target.checked);
    };

    const onFinish = (values) => {
        setIsLogingLoading(true);
        setIsSessionExpired(false);
        axios
            .post(API + "/login", { "username": values.username, "password": md5(values.password), "skip2fa": SKIP_2FA },{withCredentials: true})
            .then(async ({ data }) => {
                
                setIsLogingLoading(false);
                if (!data) {
                    Swal.fire({
                        icon: "error",
                        title: t("login.dialogs.login_error"),
                        showConfirmButton: false,
                        timer: 2000,
                    });
                } else {
                    setIsCookieEnabled(data?.cookieEnabled);
                    setUser(data);
                    if (SKIP_2FA || data.rememberme) {
                        onVerify(data);
                    }
                }
            })
            .catch((error) => {
                setIsLogingLoading(false);
                // console.log("Login Error", error);
                Swal.fire({
                    icon: "error",
                    title: t("login.dialogs.login_error"),
                    showConfirmButton: false,
                    timer: 2000,
                });
            });
    };

    const preCookieCheck = () => {
        axios
            .post(API + "/sendcookiechecker", {},{withCredentials: true})
            .then(async () => {
                setIsLogingLoading(false);
            });
    };

    const onVerify = async (userbypass = null) => {
        // const rememberme = userbypass?.rememberme ? !userbypass.rememberme : true;

        if (!SKIP_2FA && !userbypass?.rememberme) {
            const postdata = {
                otp:otp
            };
            if (rememberme) {
                postdata.rememberme = 'on'
            }

            const isVerified = await axios //
                .post(API + "/otpverify", postdata, { withCredentials: true, headers: { Authorization: "Bearer " + user.access_token } })
                .then(({ data }) => data.verify)
                .catch(() => false);

            if (!isVerified) {
                setOtp("");
                Swal.fire({
                    icon: "error",
                    title: t("login.dialogs.verify_error"),
                    showConfirmButton: false,
                    timer: 2000,
                });

                return false;
            }
        }

        let userdata = null;

        if (user) {
            userdata = user;
        } else if (userbypass) {
            userdata = userbypass;
        } else {
            return false;
        }
  

        const payload = JWT.verify(userdata.access_token, JWT_SECRET);

        userdata = { ...userdata, fullName: `${userdata.firstname} ${userdata.lastname}` };
        userdata = { ...userdata, validate: md5(JSON.stringify(userdata)) };
        userdata = { ...userdata, expiry: moment().add(timeoutAfter, "minutes").format() };

        localStorage.setItem("loggedUser", JSON.stringify(userdata));
        localStorage.setItem("loggedUserSettings", userdata.dashboard_settings ? JSON.stringify(userdata.dashboard_settings) : null);
        localStorage.setItem("authuser", window.btoa(`${payload.uid}:${payload.username}`));
        localStorage.setItem("access_token", userdata.access_token);

        if (userdata.theme) {
            if (Array.isArray(userdata.theme)) {
                // Removed by Jericho 2023-08-23 - Removing the txshield themes/reseller logo
                // Logo from Reseller
                // if (userdata.theme[0].logo) {
                //     localStorage.setItem("logo", userdata.theme[0].logo);
                // }

                if (userdata.theme[0].dashboardtheme) {
                    localStorage.setItem("dashboardtheme", userdata.theme[0].dashboardtheme.replaceAll('/"', "'"));
                }
            }
        }

        // Removed by Jericho 2023-08-23 - Removing the txshield themes/reseller logo
        // TxShield Themes Logo, this will override the reseller logo
        // if (userdata?.theme_logo) {
        //     localStorage.setItem("logo", userdata.theme_logo);
        // }

        // OI Access
        if (!DISABLE_OI && AssociationsChecker("OI")) {
            localStorage.setItem("oiAssocication", AssociationReferences("OI"));
        } else {
            localStorage.removeItem("oiAssocication");
        }

        // CBM Access
        if (!DISABLE_CBM) {
            if(GroupAccess("SYSADMIN"))
            {
                localStorage.setItem("cbm_token", CBM_TOKEN);
            }else if(AssociationsChecker("CBM")){
                
                    
                    //if only one merchant, store the permanent token
                    const token = await CBMToken(JSON.parse(localStorage.getItem("loggedUser")).userid);
                   
                    if(token)
                    {
                        localStorage.setItem("cbm_token", token);
                    }

                    //get merchant providers
                    //commenting it out as its not used now
                /*    const refs = AssociationReferences("CBM");
                    
                    if (refs) {
                        const merchantProviders = await axios
                            .post(CBM_URL + "/api/v1/merchantProviders", { mids: refs },{ headers: { Authorization: "Bearer " + localStorage.getItem("cbm_token") }})
                            .then(({ data }) => {
                             
                                if(data.list)
                                {
                                    return data.list;
                                }
                            })
                            .catch(() => false);
                          
                        if (Array.isArray(merchantProviders) && merchantProviders.length > 0) {
                            let cbm = await merchantProviders
                                .reduce(function (a, k) {
                                    a.push(`${k.mid},${k.pid}`);
                                    return a;
                                }, [])
                                .join("|");
                            if (cbm) {
                              
                                localStorage.setItem("cbm", window.btoa(cbm));
                            }
                        }
                    }  */
                
            }
        } else {
            localStorage.removeItem("cbm");
        }

        /*  Txalerts */
        if (!DISABLE_TXALERT2) {
            localStorage.setItem("txalert_token", TXALERT2_TOKEN);
        }
  
        Swal.fire({
            icon: "success",
            title: t("login.dialogs.login_success"),
            showConfirmButton: false,
            timer: 2000,
            onClose: () => {
                let redirectLocation = localStorage.getItem("redirectLocation");
                localStorage.setItem("redirectLocation","");
                props.history.push(redirectLocation ? redirectLocation : "/dashboard")
            },
        });
    };

    const getSelectLanguage = () => {
        return (
            <Row type="flex" gutter={[8, 0]} justify="end" style={{ marginBottom: "1rem" }}>
                <Col>{getDropdownSelectLanguage()}</Col>
            </Row>
        );
    };

    return !user ? (
        <ConfigProvider locale={locale}>
            <div className={`login-warp ${locale.locale}`}>
                <div className="login-warp--box">
                    <img
                        src={`../themes/${THEME ? THEME : "default"}/payshield-origin.png`}
                        width={"100%"}
                        style={{ display: "block", maxWidth: "300px", margin: "0 auto 1rem auto" }}
                        alt="payshield dashboard"
                    />
                    {getSelectLanguage()}
                    {isSessionExpired ? (
                        <Paragraph type="danger" className="text-center">
                            {t("login.session.expired")}
                        </Paragraph>
                    ) : (
                        ""
                    )}
                    <Form {...layout} onValuesChange={formValChange} onFinish={() => onFinish(login)}>
                        <Form.Item name="username" rules={[{ required: true, message: t("login.required.username") }]}>
                            <Input
                                size="large"
                                placeholder={t("login.username")}
                                prefix={<UserOutlined style={{ color: "gray" }} />}
                                disabled={isLoginLoading}
                            />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: t("login.required.password") }]} style={{ marginBottom: ".5rem" }}>
                            <Input.Password
                                size="large"
                                placeholder={t("login.password")}
                                prefix={<LockOutlined style={{ color: "gray" }} />}
                                disabled={isLoginLoading}
                            />
                        </Form.Item>
                        <Form.Item className="text-right" style={{ marginBottom: ".5rem" }}>
                            <Link to={"/forgotpassword"}>{t("login.forgotpassword")}</Link>
                        </Form.Item>
                        <Form.Item className="text-center">
                            <Button type="primary" htmlType="submit" className="login-form-button" size="large" shape="round" loading={isLoginLoading}>
                                {t("login.login")}
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </ConfigProvider>
    ) : !SKIP_2FA ? (
        !user["verify_option"] ? (
            <ConfigProvider locale={locale}>
                <OptionVerify t={t} email={user.email} access_token={user.access_token} handleChange={optionChange} />
            </ConfigProvider>
        ) : (
            <ConfigProvider locale={locale}>
                <OtpVerify
                    t={t}
                    otp={otp}
                    rememberme={ rememberme }
                    iscookieEnabled={ iscookieEnabled }
                    handleChange={otpChange}
                    handleCheckboxChange={rememberChange}
                    onSubmit={onVerify}
                    option={user["verify_option"]}
                    qrcode={user["2fa_qrcode"]}
                    secret={user["2fa_secret"]}
                    firstlogin_succeed={user["first_time_verify"]}
                />
            </ConfigProvider>
        )
    ) : null;
};

export default Login;
