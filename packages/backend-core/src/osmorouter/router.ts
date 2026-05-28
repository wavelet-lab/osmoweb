import { ControlController } from '@/osmorouter/controllers/control.controller';
import { AbisRslController } from '@/osmorouter/controllers/abis-rsl.controller';
import { AbisOmlController } from '@/osmorouter/controllers/abis-oml.controller';
import { MediaController } from '@/osmorouter/controllers/media.controller';
import type { LoggerFactory, OsmoController, OsmoControllerClass } from '@/osmorouter/controllers/controller.type';
import { DefaultController } from '@/osmorouter/controllers/default.controller';
import type { OsmoParams } from '@/osmorouter/lib/common.types';
import type { LoggerInterface } from '@websdr/core/utils';
import { SimpleLogger } from '@websdr/core/utils';

export class Router {
    private readonly logger;
    private readonly createLogger: LoggerFactory;
    private readonly controllerMap = new Map<string, OsmoControllerClass>([
        ['control', ControlController],
        ['abis_rsl', AbisRslController],
        ['abis_oml', AbisOmlController],
        ['media', MediaController],
    ]);

    private instanceCtrlMap = new Map<string, OsmoController>();
    private defaultController: DefaultController;

    constructor(logger?: LoggerInterface, loggerFactory?: LoggerFactory) {
        this.createLogger = loggerFactory ?? ((context: string) => logger ?? new SimpleLogger(context));
        this.logger = logger ?? this.createLogger(Router.name);
        this.defaultController = new DefaultController(this.createLogger(DefaultController.name));
        this.logger.log?.('Osmo router created');
    }

    /**
     * Register a new controller class.
     * @param token The token to identify the controller.
     * @param cls The controller class.
     */
    register(token: string, cls: OsmoControllerClass) {
        this.controllerMap.set(token, cls);
        this.logger.log?.(`Registered controller: ${token}`);
    }

    /**
     * Initialize the router with the given Osmo parameters.
     * @param osmoParams The Osmo parameters.
     */
    init(osmoParams: OsmoParams) {
        for (const [path, cls] of this.controllerMap.entries()) {
            this.instanceCtrlMap.set(path, new cls(osmoParams, this.createLogger(cls.name), this.createLogger));
            this.logger.log?.(`Initialized controller: ${path}`);
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
            this.logger.debug?.(`Routing to ${this.controllerMap.get(token)!.name}`);
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
