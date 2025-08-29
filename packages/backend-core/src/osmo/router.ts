import { ControlController } from '@/osmo/controllers/control.controller';
import { AbisRslController } from '@/osmo/controllers/abis-rsl.controller';
import { AbisOmlController } from '@/osmo/controllers/abis-oml.controller';
import { MediaController } from '@/osmo/controllers/media.controller';
import type { OsmoController, OsmoControllerClass } from '@/osmo/controllers/controller.type';
import { DefaultController } from '@/osmo/controllers/default.controller';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';
import type { OsmoParams } from '@/osmo/lib/common.types';

export class Router {
    private readonly log;
    private readonly controllerMap = new Map<string, OsmoControllerClass>([
        ['control', ControlController],
        ['abis_rsl', AbisRslController],
        ['abis_oml', AbisOmlController],
        ['media', MediaController],
    ]);

    private instanceCtrlMap = new Map<string, OsmoController>();
    private defaultController = new DefaultController();

    constructor(logger?: LoggerInterface) {
        this.log = logger ?? new SimpleLogger();
    }

    /**
     * Register a new controller class.
     * @param token The token to identify the controller.
     * @param cls The controller class.
     */
    register(token: string, cls: OsmoControllerClass) {
        this.controllerMap.set(token, cls);
    }

    /**
     * Initialize the router with the given Osmo parameters.
     * @param osmoParams The Osmo parameters.
     */
    init(osmoParams: OsmoParams) {
        for (const [path, cls] of this.controllerMap.entries()) {
            this.instanceCtrlMap.set(path, new cls(osmoParams));
        }
    }

    /**
     * Resolve a controller by its token.
     * @param token The token to identify the controller.
     * @returns The resolved controller instance.
     */
    resolve(token: string): OsmoController {
        const ctrl = this.instanceCtrlMap.get(token);
        if (ctrl) {
            this.log.debug?.(`Routing to ${this.controllerMap.get(token)!.name}`);
            return ctrl;
        }
        return this.defaultController;
    }

    /**
     * Route a request to the appropriate controller.
     * @param uri The request URI.
     * @param port The request port.
     * @returns The resolved controller instance.
     */
    to(uri: string, port: Number): OsmoController {
        const ctrlToken = uri.slice(uri.lastIndexOf('/') + 1);
        return this.resolve(ctrlToken);
    }

}