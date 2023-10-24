import { DefaultLayout, ManagementLayout } from '~/component/Layout';
import Home from '~/view/Home';
import Login from '~/view/Login';
import PageNotFound from '~/view/PageNotFound';

const publicRouter = [
    { path: '/', component: Home, layout: DefaultLayout },
    { path: '/login', component: Login, layout: ManagementLayout },
    { path: '*', component: PageNotFound },
];

const privateRouter = [];

export { publicRouter, privateRouter };
