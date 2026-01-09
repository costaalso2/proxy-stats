import java.io.*;
import java.util.*;
import org.apache.http.HttpHost;
import org.apache.http.client.fluent.*;

public class ProxyFileValidator {
    public static void main(String[] args) {
        String inputFile = "webshare_proxies.txt";   // archivo descargado de Webshare
        String outputFile = "valid_proxies.txt";     // archivo donde se guardan los válidos
        List<String> validProxies = new ArrayList<>();

        // Leer archivo línea por línea
        try (BufferedReader reader = new BufferedReader(new FileReader(inputFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    String[] parts = line.trim().split(":");
                    if (parts.length < 4) {
                        System.out.println("⚠️ Formato inválido: " + line);
                        continue;
                    }

                    String host = parts[0];
                    int port = Integer.parseInt(parts[1]);
                    String user = parts[2];
                    String pass = parts[3];

                    try {
                        HttpHost proxy = new HttpHost(host, port);
                        String res = Executor.newInstance()
                                .auth(proxy, user, pass)
                                .execute(Request.Get("http://ipv4.webshare.io/").viaProxy(proxy))
                                .returnContent().asString();

                        System.out.println("✅ Proxy " + host + ":" + port + " → " + res);
                        validProxies.add(line.trim());
                    } catch (Exception e) {
                        System.out.println("❌ Proxy " + host + ":" + port + " falló: " + e.getMessage());
                    }
                }
            }
        } catch (IOException e) {
            System.out.println("❌ Error leyendo archivo: " + e.getMessage());
            return;
        }

        // Guardar proxies válidos
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(outputFile))) {
            for (String proxy : validProxies) {
                writer.write(proxy);
                writer.newLine();
            }
            System.out.println("✅ Proxies válidos guardados en: " + outputFile);
        } catch (IOException e) {
            System.out.println("❌ Error escribiendo archivo: " + e.getMessage());
        }
    }
}
